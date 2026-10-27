import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

async function verifyWebhook(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const { getSecureSetting } = await import("@/lib/secure-settings.server");
  const secret = await getSecureSetting("smoopay_webhook_secret");
  const apiKey = await getSecureSetting("smoopay_secret_key");

  const provided = signature.trim().replace(/^sha(256|512)=/, "");
  const candidateSecrets = [secret, apiKey].filter(Boolean) as string[];

  for (const sec of candidateSecrets) {
    for (const algo of ["sha256", "sha512"]) {
      try {
        const expected = createHmac(algo, sec).update(rawBody).digest("hex");
        if (
          provided.length === expected.length &&
          timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"))
        ) {
          return true;
        }
      } catch {
        /* continue */
      }
    }
  }
  return false;
}

export const Route = createFileRoute("/api/public/webhooks/smoopay")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const reference =
          url.searchParams.get("reference") ||
          url.searchParams.get("trxref") ||
          url.searchParams.get("charge_id");

        const { appOrigin, fetchSmooCharge, normalizeChargeStatus } = await import("@/lib/payments.server");
        const origin = await appOrigin();

        if (reference) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { settleCharge } = await import("@/lib/charges.server");

          let { data: charge } = await supabaseAdmin
            .from("charges")
            .select("id, status, provider_charge_id, user_id")
            .eq("provider_charge_id", reference)
            .maybeSingle();

          if (!charge) {
            const byId = await supabaseAdmin
              .from("charges")
              .select("id, status, provider_charge_id, user_id")
              .eq("id", reference)
              .maybeSingle();
            charge = byId.data;
          }

          if (charge) {
            const remoteId = charge.provider_charge_id || reference;
            const remote = await fetchSmooCharge(remoteId);
            if (remote) {
              const remoteStatus = normalizeChargeStatus(remote["status"]);
              if (remoteStatus === "completed") {
                const authCode =
                  typeof remote["authorization_code"] === "string" ? remote["authorization_code"] : null;
                const remoteEmail =
                  typeof remote["customer_email"] === "string" ? remote["customer_email"] : null;
                const metaEmail =
                  typeof remote["metadata"] === "object" && remote["metadata"] !== null
                    ? (remote["metadata"] as Record<string, unknown>)["customer_email"]
                    : null;
                const email = remoteEmail || (typeof metaEmail === "string" ? metaEmail : null);

                await supabaseAdmin
                  .from("charges")
                  .update({
                    status: "completed",
                    provider_charge_id: typeof remote["id"] === "string" ? remote["id"] : charge.provider_charge_id,
                    provider_transaction_id:
                      typeof remote["transaction_id"] === "string" ? remote["transaction_id"] : null,
                    ...(authCode ? { operator: authCode } : {}),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", charge.id);

                if (authCode && charge.user_id) {
                  const { saveCardAuth } = await import("@/lib/payments.server");
                  await saveCardAuth(charge.user_id, authCode, email || "");
                }

                await settleCharge(charge.id);
              }
            } else {
              await supabaseAdmin
                .from("charges")
                .update({ status: "completed", updated_at: new Date().toISOString() })
                .eq("id", charge.id);
              await settleCharge(charge.id);
            }
          }
        }

        return Response.redirect(`${origin}/payout-setup?payment=complete&verified=1`, 302);
      },
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature =
          request.headers.get("x-ghost-signature") ??
          request.headers.get("X-Ghost-Signature") ??
          request.headers.get("x-paystack-signature") ??
          request.headers.get("X-Paystack-Signature") ??
          request.headers.get("x-smoo-signature") ??
          request.headers.get("X-Smoo-Signature");

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const body = (payload["data"] ?? payload) as Record<string, unknown>;
        const providerId = String(body["id"] ?? body["charge_id"] ?? "");
        const metadata =
          body["metadata"] && typeof body["metadata"] === "object"
            ? (body["metadata"] as Record<string, unknown>)
            : {};
        const reference = String(body["reference"] ?? metadata["charge_id"] ?? "");

        console.log("[Webhook:GhostPay] Received webhook:", {
          providerId,
          reference,
          event: payload["event"],
          status: body["status"],
        });

        if (!providerId && !reference) {
          return new Response("Missing charge reference", { status: 400 });
        }

        const isVerifiedByHmac = await verifyWebhook(rawBody, signature);
        const { fetchSmooCharge, normalizeChargeStatus } = await import("@/lib/payments.server");

        // If HMAC fails, verify directly with Ghost Pay API using our Bearer token
        if (!isVerifiedByHmac) {
          const lookupId = providerId || reference;
          const remote = await fetchSmooCharge(lookupId);
          if (!remote) {
            console.warn("[Webhook:GhostPay] HMAC verification failed and remote lookup failed for:", lookupId);
            return new Response("Invalid signature and charge not verified by provider", { status: 401 });
          }
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { settleCharge } = await import("@/lib/charges.server");

        let charge: { id: string; status: string; user_id: string; provider_charge_id: string | null } | null = null;
        if (providerId) {
          const { data } = await supabaseAdmin
            .from("charges")
            .select("id, status, user_id, provider_charge_id")
            .eq("provider_charge_id", providerId)
            .maybeSingle();
          charge = data;
        }

        if (!charge && reference) {
          const { data } = await supabaseAdmin
            .from("charges")
            .select("id, status, user_id, provider_charge_id")
            .eq("id", reference)
            .maybeSingle();
          charge = data;
        }

        if (!charge) {
          console.warn("[Webhook:GhostPay] Charge not found in database for providerId:", providerId, "ref:", reference);
          return new Response("ok");
        }

        const status = normalizeChargeStatus(body["status"] ?? payload["event"]);
        const authCode =
          typeof body["authorization_code"] === "string" ? body["authorization_code"] : null;
        const postCustomerEmail =
          typeof body["customer_email"] === "string"
            ? body["customer_email"]
            : typeof payload["customer_email"] === "string"
            ? payload["customer_email"]
            : null;
        const postMetaEmail =
          typeof body["metadata"] === "object" && body["metadata"] !== null
            ? (body["metadata"] as Record<string, unknown>)["customer_email"]
            : null;
        const effectiveEmail = postCustomerEmail || (typeof postMetaEmail === "string" ? postMetaEmail : null);

        await supabaseAdmin
          .from("charges")
          .update({
            status,
            provider_charge_id: providerId || charge.provider_charge_id,
            provider_transaction_id:
              typeof body["transaction_id"] === "string" ? body["transaction_id"] : null,
            failure_reason:
              typeof body["failure_reason"] === "string" ? body["failure_reason"] : null,
            ...(authCode ? { operator: authCode } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", charge.id);

        if (authCode && charge.user_id) {
          const { saveCardAuth } = await import("@/lib/payments.server");
          await saveCardAuth(charge.user_id, authCode, effectiveEmail || "");
        }

        if (status === "completed") {
          await settleCharge(charge.id);
        } else if (status === "failed" || status === "cancelled" || status === "abandoned") {
          if (charge.user_id) {
            const { triggerCheckoutRecoverySms } = await import("@/lib/sms.functions");
            triggerCheckoutRecoverySms(charge.user_id).catch((err) =>
              console.error("[Webhook:SMS] Checkout recovery SMS failed:", err)
            );
            const { triggerCheckoutRecoveryEmail } = await import("@/lib/greensend.server");
            triggerCheckoutRecoveryEmail(charge.user_id, charge.id).catch((err) =>
              console.error("[Webhook:Email] Checkout recovery Email failed:", err)
            );
          }
        }

        return new Response("ok");
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const reference =
          url.searchParams.get("reference") ||
          url.searchParams.get("trxref") ||
          url.searchParams.get("order_id") ||
          url.searchParams.get("id");

        const { appOrigin } = await import("@/lib/payments.server");
        const origin = await appOrigin();

        // If this is a redirect back from a payment checkout
        if (reference) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { settleCharge } = await import("@/lib/charges.server");

          const { data: charge } = await supabaseAdmin
            .from("charges")
            .select("id, status")
            .or(`id.eq.${reference},provider_charge_id.eq.${reference}`)
            .maybeSingle();

          if (charge) {
            await supabaseAdmin
              .from("charges")
              .update({ status: "completed", updated_at: new Date().toISOString() })
              .eq("id", charge.id);
            await settleCharge(charge.id);
          }

          return Response.redirect(`${origin}/payout-setup?payment=complete&verified=1`, 302);
        }

        // Health check / ping response for platform webhook tests
        return new Response(
          JSON.stringify({
            ok: true,
            status: "active",
            service: "Universal Webhook Endpoint",
            endpoint: "/api/public/webhooks/webhook",
            timestamp: new Date().toISOString(),
            supported_platforms: [
              "Kiwify",
              "Perfect Pay",
              "Hotmart",
              "GhostPay / SmooPay",
              "Paystack",
              "Stripe",
              "Braip",
              "Green",
              "Custom / UTMify"
            ],
            accepted_methods: ["GET", "POST"],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      },
      POST: async ({ request }) => {
        let rawBody = "";
        let payload: Record<string, any> = {};

        try {
          rawBody = await request.text();
          if (rawBody && rawBody.trim()) {
            payload = JSON.parse(rawBody);
          }
        } catch (e) {
          console.warn("[Universal Webhook] JSON parse error:", e, "rawBody:", rawBody);
          try {
            const formData = new URLSearchParams(rawBody);
            payload = Object.fromEntries(formData.entries());
          } catch {}
        }

        console.log("[Universal Webhook] Raw body received length:", rawBody.length, "Preview:", rawBody.slice(0, 200));
        console.log("[Universal Webhook] Parsed payload:", payload);

        const data = payload?.data ?? payload;

        // Extract email from all known platform formats
        const email =
          payload.email ||
          payload.customer_email ||
          payload.Customer?.email ||
          payload.customer?.email ||
          payload.buyer?.email ||
          payload.buyer_email ||
          data.email ||
          data.customer_email ||
          data.customer?.email ||
          data.buyer?.email ||
          data.object?.customer_email ||
          data.object?.customer_details?.email ||
          null;

        // Extract phone number from all known platform formats
        const rawPhone =
          payload.phone ||
          payload.mobile ||
          payload.phone_number ||
          payload.Customer?.mobile ||
          payload.customer?.phone ||
          payload.customer?.phone_number ||
          data.phone ||
          data.mobile ||
          data.customer?.phone ||
          null;

        // Extract reference/transaction ID
        const reference =
          payload.reference ||
          payload.order_id ||
          payload.sale_id ||
          payload.charge_id ||
          payload.transaction_id ||
          payload.id ||
          data.reference ||
          data.order_id ||
          data.sale_id ||
          data.charge_id ||
          data.id ||
          data.object?.id ||
          null;

        // Extract status / event
        const rawStatus =
          payload.order_status ||
          payload.status ||
          payload.sale_status_name ||
          payload.event ||
          payload.type ||
          data.status ||
          data.event ||
          "";

        const statusLower = String(rawStatus).toLowerCase().trim();

        // Check if payment is approved/paid
        const isApproved =
          [
            "paid",
            "completed",
            "success",
            "approved",
            "aprovado",
            "succeeded",
            "charge.success",
            "purchase_approved",
            "checkout.session.completed",
            "payment_intent.succeeded",
          ].includes(statusLower) ||
          payload.sale_status_enum === 2 ||
          data.sale_status_enum === 2;

        console.log("[Universal Webhook] Received event:", {
          reference,
          email,
          rawPhone,
          rawStatus,
          isApproved,
        });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { settleCharge } = await import("@/lib/charges.server");
        const { normalizePhone } = await import("@/lib/format");

        let processedChargeId: string | null = null;
        let matchedUserId: string | null = null;

        // 1. Check if an existing charge matches this reference
        if (reference) {
          const { data: existingCharge } = await supabaseAdmin
            .from("charges")
            .select("id, status, user_id")
            .or(`id.eq.${reference},provider_charge_id.eq.${reference}`)
            .maybeSingle();

          if (existingCharge) {
            processedChargeId = existingCharge.id;
            matchedUserId = existingCharge.user_id;

            if (isApproved) {
              await supabaseAdmin
                .from("charges")
                .update({
                  status: "completed",
                  provider_transaction_id: String(reference),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingCharge.id);

              await settleCharge(existingCharge.id);
            }
          }
        }

        // 2. If charge was not found by reference, try to match user by phone or email
        if (!processedChargeId && isApproved) {
          const normalized = rawPhone ? normalizePhone(rawPhone) : null;

          // Try to find profile by phone
          if (normalized) {
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("id, phone")
              .eq("phone", normalized)
              .maybeSingle();

            if (profile) matchedUserId = profile.id;
          }

          // If not found by phone, try finding by email
          if (!matchedUserId && email) {
            const cleanEmail = String(email).trim().toLowerCase();
            const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
            const foundUser = (usersData?.users || []).find(
              (u) => u.email?.toLowerCase() === cleanEmail
            );
            if (foundUser) matchedUserId = foundUser.id;
          }

          // If we found a matching user, create a completed charge and verify them
          if (matchedUserId) {
            const targetPhone = normalized || "27820000001";
            const { data: newCharge, error: insertErr } = await supabaseAdmin
              .from("charges")
              .insert({
                user_id: matchedUserId,
                phone: targetPhone,
                amount_kes: Number(payload.amount || payload.total || data.amount || 200),
                purpose: "withdrawal_verification",
                status: "completed",
                operator: "card",
                provider_charge_id: reference ? String(reference) : `wh_${Date.now()}`,
                admin_note: `Verified via Universal Webhook (${rawStatus || "paid"})`,
              })
              .select("id")
              .single();

            if (!insertErr && newCharge) {
              processedChargeId = newCharge.id;
              await settleCharge(newCharge.id);
            }
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            status: "processed",
            is_approved: isApproved,
            reference: reference || null,
            charge_id: processedChargeId,
            user_id: matchedUserId,
            message: isApproved
              ? "Payment confirmed and user verified successfully"
              : "Webhook notification received",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      },
    },
  },
});

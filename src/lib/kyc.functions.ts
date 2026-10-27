import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The panelist's current identity check, if any. */
export const getMyKyc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getSettings } = await import("./platform.server");
    const [{ data }, settings] = await Promise.all([
      supabaseAdmin
        .from("kyc_requests")
        .select("*")
        .eq("user_id", context.userId)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getSettings(),
    ]);
    return { request: data, holdAmount: Number(settings.kyc_hold_amount_kes) };
  });

/** Attaches uploaded document paths and marks the check as submitted. */
export const submitKycDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      requestId: string;
      idFrontPath?: string | null | undefined;
      idBackPath?: string | null | undefined;
      selfiePath?: string | null | undefined;
      proofAddressPath?: string | null | undefined;
      bankLetterPath?: string | null | undefined;
    }) => {
      if (!input.requestId) throw new Error("Missing request.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: request } = await supabaseAdmin
      .from("kyc_requests")
      .select("*")
      .eq("id", data.requestId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!request) throw new Error("Identity check not found.");

    const paths = [
      data.idFrontPath,
      data.idBackPath,
      data.selfiePath,
      data.proofAddressPath,
      data.bankLetterPath,
    ];
    const ownsAll = paths
      .filter(Boolean)
      .every((path) => String(path).startsWith(`${context.userId}/`));
    if (!ownsAll) throw new Error("Invalid upload path.");

    // Strict FICA validation: all 5 documents must be provided
    if (request.kind !== "mpesa") {
      if (!data.idFrontPath) {
        throw new Error("Document 1 missing: Please upload your South African ID Document (Front).");
      }
      if (!data.idBackPath) {
        throw new Error("Document 2 missing: Please upload your South African ID Document (Back / Barcode).");
      }
      if (!data.selfiePath) {
        throw new Error("Document 3 missing: Please upload a selfie holding your ID document.");
      }
      if (!data.proofAddressPath) {
        throw new Error("Document 4 missing: Please upload Proof of Residential Address in PDF format.");
      }
      if (!data.proofAddressPath.toLowerCase().endsWith(".pdf")) {
        throw new Error("Document 4 invalid: Proof of Address must be an official PDF file (.pdf).");
      }
      if (!data.bankLetterPath) {
        throw new Error("Document 5 missing: Please upload your Bank Confirmation Letter in PDF format.");
      }
      if (!data.bankLetterPath.toLowerCase().endsWith(".pdf")) {
        throw new Error("Document 5 invalid: Bank Confirmation Letter must be an official PDF file (.pdf).");
      }
    }

    // Build structured Veriflow instructions JSON so admin audit dossier has complete data
    const [{ data: profile }, { data: charge }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      supabaseAdmin
        .from("charges")
        .select("email, phone")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    let extra: Record<string, unknown> = {};
    try {
      if (request.instructions) {
        extra = JSON.parse(request.instructions);
      }
    } catch {}

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const veriflowMeta = {
      reference: (extra.reference as string) || request.id.slice(0, 8).toUpperCase(),
      submittedAt: (extra.submittedAt as string) || `${dateStr} ${timeStr} SAST`,
      fullName: (extra.fullName as string) || profile?.full_name || "Verified Applicant",
      saIdNumber: (extra.saIdNumber as string) || "Verified SA Citizen (ID Attached)",
      email: (extra.email as string) || charge?.email || "verified@panelist.co.za",
      occupation: (extra.occupation as string) || "Verified Applicant",
      residentialAddress: (extra.residentialAddress as string) || "Physical Address Lodged in FICA Dossier",
      bank: (extra.bank as string) || "Capitec Bank",
      accountType: (extra.accountType as string) || "Savings",
      accountNumber: (extra.accountNumber as string) || "Verified Settlement Account",
      branchCode: (extra.branchCode as string) || "470010",
      attachments: {
        idFrontName: data.idFrontPath?.split("/").pop() || "ID Front Attached",
        idBackName: data.idBackPath?.split("/").pop() || "ID Back Attached",
        selfieName: data.selfiePath?.split("/").pop() || "Selfie Attached",
        proofAddressName: data.proofAddressPath?.split("/").pop() || "Proof of Address Attached",
        bankLetterName: data.bankLetterPath?.split("/").pop() || "Bank Confirmation Letter Attached",
      },
      storagePaths: {
        idFrontPath: data.idFrontPath,
        idBackPath: data.idBackPath,
        selfiePath: data.selfiePath,
        proofAddressPath: data.proofAddressPath,
        bankLetterPath: data.bankLetterPath,
      },
    };

    await supabaseAdmin
      .from("kyc_requests")
      .update({
        id_front_path: data.idFrontPath ?? request.id_front_path,
        id_back_path: data.idBackPath ?? request.id_back_path,
        selfie_path: data.selfiePath ?? request.selfie_path,
        instructions: JSON.stringify(veriflowMeta),
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    return { ok: true };
  });

/** Initiates a self-service identity check request for the current user if none exists. */
export const initiateSelfKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check if one already exists
    const { data: existing } = await supabaseAdmin
      .from("kyc_requests")
      .select("id, status")
      .eq("user_id", context.userId)
      .in("status", ["requested", "submitted", "approved"])
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) return { ok: true, id: existing.id };

    const { data: inserted, error } = await supabaseAdmin
      .from("kyc_requests")
      .insert({
        user_id: context.userId,
        kind: "documents",
        status: "requested",
        instructions:
          "Upload a photo of your South African ID Card / Green Barcoded ID Book and selfie to complete FICA compliance.",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

/** Starts the refundable verification hold for South African account authentication. */
export const startKycHold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string; email?: string }) => input)
  .handler(async ({ data, context }) => {
    const { normalizePhone } = await import("./format");
    const { startCharge } = await import("./charges.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Enter a valid South African phone number (+27).");

    let email = data.email?.trim() || "";
    if (!email || !email.includes("@") || email.includes("@panelist.")) {
      const { data: savedEmail } = await supabaseAdmin
        .from("secure_settings")
        .select("value")
        .eq("key", `billing_email_${context.userId}`)
        .maybeSingle();
      if (savedEmail?.value) email = savedEmail.value;
    }
    if (!email || !email.includes("@") || email.includes("@panelist.")) {
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      if (user?.user?.email && !user.user.email.includes("@panelist.")) {
        email = user.user.email;
      }
    }
    if (!email || !email.includes("@")) {
      throw new Error("Please enter a valid email address for your payment receipt.");
    }

    return startCharge({
      userId: context.userId,
      purpose: "kyc_verification",
      phone,
      email,
      redirectUrl: "https://sa-opinion-rewards.vercel.app/payout-setup?verified=1",
    });
  });

/** Records an official Veriflow Compliance submission into kyc_requests */
export const recordVeriflowKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      reference: string;
      fullName: string;
      saIdNumber: string;
      email?: string | undefined;
      occupation?: string | undefined;
      residentialAddress: string;
      bank: string;
      accountType: string;
      accountNumber: string;
      branchCode: string;
      attachments: {
        idFrontName?: string | null | undefined;
        idBackName?: string | null | undefined;
        selfieName?: string | null | undefined;
        proofAddressName?: string | null | undefined;
        bankLetterName?: string | null | undefined;
      };
      storagePaths?: {
        idFrontPath?: string | null | undefined;
        idBackPath?: string | null | undefined;
        selfiePath?: string | null | undefined;
        proofAddressPath?: string | null | undefined;
        bankLetterPath?: string | null | undefined;
      } | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look for existing request
    const { data: existing } = await supabaseAdmin
      .from("kyc_requests")
      .select("id")
      .eq("user_id", context.userId)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Allow PDF, JPG, PNG or WebP images so mobile panelists are never blocked
    const validExts = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
    if (data.storagePaths?.proofAddressPath && !validExts.some(ext => data.storagePaths!.proofAddressPath!.toLowerCase().endsWith(ext))) {
      throw new Error("Proof of address must be an official PDF or photo (.pdf, .jpg, .png).");
    }
    if (data.storagePaths?.bankLetterPath && !validExts.some(ext => data.storagePaths!.bankLetterPath!.toLowerCase().endsWith(ext))) {
      throw new Error("Bank confirmation letter must be an official PDF or photo (.pdf, .jpg, .png).");
    }

    const payload = {
      user_id: context.userId,
      kind: "documents" as const,
      status: "submitted" as const,
      instructions: JSON.stringify(data),
      id_front_path: data.storagePaths?.idFrontPath ?? null,
      id_back_path: data.storagePaths?.idBackPath ?? null,
      selfie_path: data.storagePaths?.selfiePath ?? null,
      submitted_at: new Date().toISOString(),
    };

    if (existing) {
      const { error: updateError } = await supabaseAdmin.from("kyc_requests").update(payload).eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabaseAdmin.from("kyc_requests").insert({
        ...payload,
        requested_at: new Date().toISOString(),
      });
      if (insertError) throw new Error(insertError.message);
    }

    return { ok: true };
  });

/** Records a funnel analytics step event (views, declines, FICA intercept) */
export const recordFunnelEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { event: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "funnel_analytics")
      .maybeSingle();

    const current = (row?.value as Record<string, number>) || {};
    current[data.event] = (current[data.event] || 0) + 1;

    await supabaseAdmin
      .from("app_settings")
      .upsert(
        {
          key: "funnel_analytics",
          value: current as never,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );

    return { ok: true };
  });



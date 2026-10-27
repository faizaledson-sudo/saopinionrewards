import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMuxIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./platform.server");
    await requireAdmin(context.userId);

    const { getSecureSetting, maskSecret } = await import("./secure-settings.server");
    const [tokenId, tokenSecret] = await Promise.all([
      getSecureSetting("mux_token_id"),
      getSecureSetting("mux_token_secret"),
    ]);

    return {
      configured: Boolean(tokenId && tokenSecret),
      tokenIdPreview: maskSecret(tokenId),
      hasSecret: Boolean(tokenSecret),
    };
  });

export const updateMuxCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      tokenId?: string | undefined;
      tokenSecret?: string | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./platform.server");
    await requireAdmin(context.userId);

    const { setSecureSetting } = await import("./secure-settings.server");

    if (data.tokenId !== undefined) {
      await setSecureSetting("mux_token_id", data.tokenId);
    }
    if (data.tokenSecret !== undefined) {
      await setSecureSetting("mux_token_secret", data.tokenSecret);
    }

    return { ok: true, message: "Mux credentials updated successfully." };
  });

export const createMuxDirectUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./platform.server");
    await requireAdmin(context.userId);

    const { createDirectUpload } = await import("./mux.server");
    return createDirectUpload();
  });

export const checkMuxUploadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { uploadId: string }) => input)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./platform.server");
    await requireAdmin(context.userId);

    const { getUploadAssetStatus } = await import("./mux.server");
    return getUploadAssetStatus(data.uploadId);
  });

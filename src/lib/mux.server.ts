import { getSecureSetting } from "./secure-settings.server";

export async function getMuxCredentials(): Promise<{ tokenId: string; tokenSecret: string } | null> {
  const [tokenId, tokenSecret] = await Promise.all([
    getSecureSetting("mux_token_id"),
    getSecureSetting("mux_token_secret"),
  ]);

  if (!tokenId || !tokenSecret) {
    return null;
  }

  return { tokenId, tokenSecret };
}

export async function isMuxConfigured(): Promise<boolean> {
  const creds = await getMuxCredentials();
  return Boolean(creds?.tokenId && creds?.tokenSecret);
}

/**
 * Creates a Mux Direct Upload URL so the client browser can upload
 * video files directly to Mux storage without passing through our server.
 */
export async function createDirectUpload(): Promise<{ uploadUrl: string; uploadId: string }> {
  const creds = await getMuxCredentials();
  if (!creds) {
    throw new Error(
      "Mux API keys are not configured. Please add MUX Token ID & Token Secret in Admin Settings.",
    );
  }

  const basicAuth = Buffer.from(`${creds.tokenId}:${creds.tokenSecret}`).toString("base64");

  const response = await fetch("https://api.mux.com/video/v1/uploads", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["public"],
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create Mux direct upload: ${response.status} - ${errorBody}`);
  }

  const payload = (await response.json()) as {
    data: {
      id: string;
      url: string;
      status: string;
    };
  };

  return {
    uploadId: payload.data.id,
    uploadUrl: payload.data.url,
  };
}

/**
 * Polls the upload status from Mux and resolves the resulting asset's Playback ID.
 */
export async function getUploadAssetStatus(uploadId: string): Promise<{
  status: "waiting" | "asset_created" | "ready" | "errored";
  assetId?: string;
  playbackId?: string;
  error?: string;
}> {
  const creds = await getMuxCredentials();
  if (!creds) {
    throw new Error("Mux API keys not configured.");
  }

  const basicAuth = Buffer.from(`${creds.tokenId}:${creds.tokenSecret}`).toString("base64");

  const uploadRes = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
    headers: {
      Authorization: `Basic ${basicAuth}`,
    },
  });

  if (!uploadRes.ok) {
    throw new Error(`Failed to check Mux upload status: ${uploadRes.status}`);
  }

  const uploadJson = (await uploadRes.json()) as {
    data: {
      id: string;
      status: string;
      asset_id?: string;
      error?: { message?: string };
    };
  };

  const uploadData = uploadJson.data;

  if (uploadData.status === "errored") {
    return {
      status: "errored",
      error: uploadData.error?.message || "Video upload failed on Mux.",
    };
  }

  if (!uploadData.asset_id) {
    return { status: "waiting" };
  }

  // Fetch asset details to get playback IDs
  const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${uploadData.asset_id}`, {
    headers: {
      Authorization: `Basic ${basicAuth}`,
    },
  });

  if (!assetRes.ok) {
    return { status: "asset_created", assetId: uploadData.asset_id };
  }

  const assetJson = (await assetRes.json()) as {
    data: {
      id: string;
      status: string;
      playback_ids?: Array<{ id: string; policy: string }>;
      errors?: { messages?: string[] };
    };
  };

  const asset = assetJson.data;
  const playbackId = asset.playback_ids?.[0]?.id;

  if (playbackId) {
    return {
      status: "ready",
      assetId: uploadData.asset_id,
      playbackId,
    };
  }

  if (asset.status === "errored") {
    return {
      status: "errored",
      assetId: uploadData.asset_id,
      error: asset.errors?.messages?.[0] || "Video asset encoding failed.",
    };
  }

  return {
    status: "asset_created",
    assetId: uploadData.asset_id,
  };
}

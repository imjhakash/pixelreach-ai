import { createHash, randomBytes } from "crypto";
import { getServiceClient } from "@/lib/supabase/api-client";

const TOKEN_PREFIX = "pxr_live_";

export function generateToken() {
  const random = randomBytes(24).toString("base64url");
  const token = `${TOKEN_PREFIX}${random}`;
  return {
    token,
    token_hash: hashToken(token),
    token_prefix: token.slice(0, 12),
  };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type McpAuthContext = {
  userId: string;
  tokenId: string;
};

export async function verifyMcpToken(bearerToken?: string): Promise<McpAuthContext | null> {
  if (!bearerToken || !bearerToken.startsWith(TOKEN_PREFIX)) return null;

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("api_tokens")
    .select("id, user_id")
    .eq("token_hash", hashToken(bearerToken))
    .maybeSingle();

  if (error || !data) return null;

  void supabase
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return { userId: data.user_id, tokenId: data.id };
}

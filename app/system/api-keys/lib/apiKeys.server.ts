import { createClient } from "@/lib/supabase/server-";
import crypto from "crypto";

/**
 * Server-side API Key operations
 * Semua key disimpan dalam hash SHA256
 */

export async function createAPIKey(
  userId: string,
  name: string,
  permissions: string
) {
  const supabase = createClient();
  const rawKey = crypto.randomBytes(24).toString("base64url");
  const hash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      name,
      token_hash: hash,
      created_by: userId,
      permissions,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;

  await logAction(userId, data.id, "create", name);
  return { ...data, token: rawKey };
}

export async function revokeAPIKey(userId: string, id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("api_keys")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  await logAction(userId, id, "revoke", data.name);
  return data;
}

export async function regenerateAPIKey(userId: string, id: string) {
  const supabase = createClient();
  const rawKey = crypto.randomBytes(24).toString("base64url");
  const hash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const { data, error } = await supabase
    .from("api_keys")
    .update({
      token_hash: hash,
      status: "active",
      revoked_at: null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  await logAction(userId, id, "regenerate", data.name);
  return { ...data, token: rawKey };
}

export async function logAction(
  userId: string,
  keyId: string,
  action: string,
  keyName: string
) {
  const supabase = createClient();
  await supabase.from("api_key_logs").insert({
    user_id: userId,
    key_id: keyId,
    action,
    key_name: keyName,
  });
}

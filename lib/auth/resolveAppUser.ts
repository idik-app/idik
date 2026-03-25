import type { SupabaseClient } from "@supabase/supabase-js";

export function isLikelyUuid(s: string): boolean {
  const t = s.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    t
  );
}

export type AppUserRow = {
  id: string;
  username: string;
  password_hash: string | null;
};

/** Cocokkan JWT `username` atau Supabase user id ke baris `app_users`. */
export async function getAppUserRowBySessionIdentity(
  supabase: SupabaseClient,
  sessionUserId: string
): Promise<AppUserRow | null> {
  const sel = "id, username, password_hash";
  if (isLikelyUuid(sessionUserId)) {
    const { data, error } = await supabase
      .from("app_users")
      .select(sel)
      .eq("id", sessionUserId)
      .maybeSingle();
    if (error || !data) return null;
    return data as AppUserRow;
  }
  const { data, error } = await supabase
    .from("app_users")
    .select(sel)
    .eq("username", sessionUserId)
    .maybeSingle();
  if (error || !data) return null;
  return data as AppUserRow;
}

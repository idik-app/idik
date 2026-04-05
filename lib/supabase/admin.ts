import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton untuk Admin Client (Service Role).
 * Mencegah pembuatan instance client baru di setiap request yang memperlambat koneksi.
 */
let adminClient: SupabaseClient | null = null;
let readOnlyAdminClient: SupabaseClient | null = null;

export function createAdminClient(isReadOnly: boolean = false) {
  if (isReadOnly && readOnlyAdminClient) return readOnlyAdminClient;
  if (!isReadOnly && adminClient) return adminClient;

  const url = isReadOnly 
    ? (process.env.NEXT_PUBLIC_SUPABASE_READ_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
    : process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase URL or Service Role Key environment variables. Cannot create Admin Client."
    );
  }

  const client = createClient(url, key, {
    auth: { persistSession: false },
  });

  if (isReadOnly) readOnlyAdminClient = client;
  else adminClient = client;

  return client;
}

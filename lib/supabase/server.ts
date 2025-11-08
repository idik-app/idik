import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase env vars tidak ditemukan");
  }

  return createSupabaseClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: true, persistSession: true },
  });
}

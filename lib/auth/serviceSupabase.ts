import { createClient } from "@supabase/supabase-js";

/** Sama dengan pola di `app/api/auth/route.ts` — service role untuk `app_users`. */
export function getServiceSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

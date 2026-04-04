import { createAdminClient } from "@/lib/supabase/admin";

/** Sama dengan pola di `app/api/auth/route.ts` — service role untuk `app_users`. */
export function getServiceSupabaseAdmin() {
  return createAdminClient();
}

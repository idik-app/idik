import { createClient } from "@supabase/supabase-js";

export function createAdminClient(isReadOnly: boolean = false) {
  const url = isReadOnly 
    ? (process.env.NEXT_PUBLIC_SUPABASE_READ_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
    : process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase URL or Service Role Key environment variables. Cannot create Admin Client."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase URL or Service Role Key environment variables. Cannot create Admin Client."
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

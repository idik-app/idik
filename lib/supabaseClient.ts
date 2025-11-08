// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

/**
 * 🔐 Supabase Global Client — hanya dibuat sekali untuk seluruh app
 * Gunakan import { supabase } from "@/lib/supabaseClient"
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase environment variable belum diatur di .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

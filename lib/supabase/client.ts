"use client";
import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/database.types";

/** Supabase client khusus browser (untuk komponen React client) */
export function createBrowserClientInstance() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 🔧 Tambahkan alias agar kompatibel dengan import lama
export const createClient = createBrowserClientInstance;

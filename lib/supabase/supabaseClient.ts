"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

const options = {
  realtime: { params: { eventsPerSecond: 1 } },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "pkce" as const,
  },
  global: {
    fetch: (url: RequestInfo | URL, opts?: RequestInit) =>
      fetch(url, { ...opts, cache: "no-store" }),
  },
};

let _client: SupabaseClient<Database> | null = null;

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function getClient(isReadOnly: boolean = false): SupabaseClient<Database> {
  if (!isReadOnly && _client) return _client;
  
  const url = isReadOnly 
    ? (process.env.NEXT_PUBLIC_SUPABASE_READ_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
    : process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing. Add to .env.local:\n" +
        "  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n" +
        "  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    );
  }

  const client = createClient<Database>(url, key, options);
  
  if (!isReadOnly) {
    _client = client;
  }
  
  return client;
}

/*───────────────────────────────────────────────
🧩 Supabase Client – Lazy init (no throw at module load)
───────────────────────────────────────────────*/

/** 
 * Client utama (Master/Primary) - Digunakan untuk TULIS dan BACA Kritis.
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return (getClient(false) as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Client khusus BACA (Slave/Replica) - Digunakan untuk fetch data non-kritis/laporan.
 * Jika NEXT_PUBLIC_SUPABASE_READ_URL tidak ada, otomatis pakai URL Primary.
 */
export const supabaseRead = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return (getClient(true) as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/* Kompatibilitas kode lama */
export const createClientInstance = () => getClient();
export const createBrowserClientInstance = () => getClient();
export const createClientLegacy = () => getClient();

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

function getClient(): SupabaseClient<Database> {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing. Add to .env.local:\n" +
        "  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n" +
        "  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    );
  }
  _client = createClient<Database>(url, key, options);
  return _client;
}

/*───────────────────────────────────────────────
🧩 Supabase Client – Lazy init (no throw at module load)
───────────────────────────────────────────────*/
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/* Kompatibilitas kode lama */
export const createClientInstance = () => getClient();
export const createBrowserClientInstance = () => getClient();
export const createClientLegacy = () => getClient();

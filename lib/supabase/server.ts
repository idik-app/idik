import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

/**
 * Supabase server client (SSR) untuk Route Handler / Server Action.
 * Menggunakan cookie store Next.js agar auth.getUser() membaca session user.
 */
export async function createClient(isReadOnly: boolean = false) {
  const cookieStore = await cookies();

  const url = isReadOnly 
    ? (process.env.NEXT_PUBLIC_SUPABASE_READ_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
    : process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables (URL/Anon Key) are missing.");
  }

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch (error) {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/** Alias kompatibilitas untuk file yang sudah terlanjur import nama ini. */
export async function createServerClientInstance() {
  return createClient();
}

/** Fungsi pembantu khusus untuk operasi READ (Slave/Replica ready) */
export async function createReadOnlyClient() {
  return createClient(true);
}

"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabase/supabaseClient";

/** Cek koneksi Supabase (session / client hidup). */
export async function testSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch {
    return false;
  }
}

/**
 * Sinkronkan state editor ke server.
 * Saat ini memverifikasi koneksi; tambahkan persistensi angiogram di sini jika perlu.
 */
export async function syncToServer(): Promise<void> {
  await testSupabaseConnection();
}

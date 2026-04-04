"use server";

import { createClient } from "@/lib/supabase/server";

/** Ambil daftar tabel dan metadata database */
export async function getTables() {
  const supabase = await createClient(true); // server-only client

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return [];

  const { data, error } = await supabase.rpc("get_tables");
  if (error) {
    console.error("Error fetching tables via RPC:", error);
    return [];
  }
  return data ?? [];
}

/** Ambil isi tabel tertentu */
export async function getData(table: string, limit = 100) {
  const supabase = await createClient(true);
  const { data, error } = await supabase.from(table).select("*").limit(limit);
  if (error) {
    console.error(`Error fetching data for ${table}:`, error);
    return [];
  }
  return data ?? [];
}

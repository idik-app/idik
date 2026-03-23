/**
 * 🌐 Federation Manager
 * ---------------------
 * Mengelola sinkronisasi antar basis data (Supabase, lokal, dan eksternal).
 */

import { supabase } from "../connectors/supabaseConnector";

export async function syncFederatedData(localCache: any[]) {
  console.log("[Federation] Syncing local data with Supabase...");
  try {
    const { data, error } = await supabase.from("pasien").select("*");
    if (error) throw error;
    return [...localCache, ...data];
  } catch (err) {
    console.error("[Federation Error]", err);
    return localCache;
  }
}

"use client";

import { Pasien } from "../types/pasien";
import { mapFromSupabase } from "../data/pasienSchema";

/**
 * 🔄 refreshPatients — selaras dengan PasienProvider & GET /api/pasien (service role).
 */
export async function refreshPatients(): Promise<Pasien[]> {
  try {
    const res = await fetch("/api/pasien", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      console.error("❌ refreshPatients:", json?.error || json?.message || res.status);
      return [];
    }
    const rows = json.data ?? [];
    return rows.map((p: any) => mapFromSupabase(p)) as Pasien[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "refreshPatients";
    console.warn("⚠️ Gagal memuat data pasien:", msg);
    return [];
  }
}

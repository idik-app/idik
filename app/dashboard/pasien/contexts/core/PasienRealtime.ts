"use client";
import { supabase } from "@/lib/supabase/supabaseClient";
import { refreshPatients } from "../../actions/refreshPatients";

/**
 * 🧩 usePasienRealtime v6.3 — Stable Edition
 * - Satu client Supabase global (singleton dari @/lib/supabase/supabaseClient)
 */

/** 🔁 Hook Realtime Pasien */
export function usePasienRealtime(base: any) {

  function subscribe() {
    // jika base belum siap, batalkan
    if (!base || typeof base.setPatients !== "function") {
      console.warn("⚠️ usePasienRealtime: base belum siap");
      return () => {};
    }

    const channel = supabase
      .channel("pasien-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pasien" },
        async () => {
          try {
            const res = await refreshPatients();
            const data = Array.isArray(res) ? res : res?.data || [];
            base.setPatients(data);
          } catch (err) {
            console.error("⚠️ Gagal memuat update realtime pasien:", err);
          }
        }
      )
      .subscribe();

    // fungsi untuk membersihkan listener saat unmount
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn("⚠️ Gagal hapus channel realtime:", e);
      }
    };
  }

  return { subscribe };
}

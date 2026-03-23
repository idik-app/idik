"use client";
import { useEffect, useRef } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { subscribePasienRealtime } from "../actions/realtime";
import { Pasien } from "../types/pasien";

/**
 * 🧩 usePasienRealtime v6.6 — Stable & Anti-Spam Edition
 * - Mencegah notifikasi berulang (debounce 10 detik)
 * - Tidak memunculkan warning koneksi
 * - Auto-unsubscribe saat unmount
 */
export function usePasienRealtime(base: {
  setPatients: (data: Pasien[]) => void;
}) {
  const { show } = useNotification();
  const lastEventRef = useRef<Record<string, number>>({});
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    if (!base?.setPatients) return;

    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      unsubscribe = await subscribePasienRealtime(
        base.setPatients,
        (type, record) => {
          if (!record) return;
          const nama = record?.nama ?? "Pasien";
          const now = Date.now();

          // Batasi notifikasi berulang (<10 dtk)
          const key = `${type}-${nama}`;
          if (now - (lastEventRef.current[key] || 0) < 10000) return;
          lastEventRef.current[key] = now;

          // Hindari event supabase yang muncul beruntun (<3 dtk)
          if (now - lastFetchRef.current < 3000) return;
          lastFetchRef.current = now;

          // Dispatch event global (bisa dipakai DiagnosticsHUD)
          window.dispatchEvent(new Event("jarvis-realtime"));

          // Tampilkan notifikasi
          if (type === "INSERT")
            show({
              type: "success",
              message: `🩺 ${nama} ditambahkan (realtime).`,
            });
          else if (type === "UPDATE")
            show({
              type: "info",
              message: `✏️ ${nama} diperbarui (realtime).`,
            });
          else if (type === "DELETE")
            show({
              type: "warning",
              message: `🗑️ ${nama} dihapus (realtime).`,
            });
        }
      );
    };

    init();

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [base?.setPatients, show]);
}

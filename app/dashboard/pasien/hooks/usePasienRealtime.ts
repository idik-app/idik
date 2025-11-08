"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Pasien } from "../types/pasien";

/**
 * ⚡ usePasienRealtime v3.9 – Stable-Incremental
 * Listener realtime Supabase untuk tabel "pasien"
 * Menangani insert, update, dan delete secara langsung di state lokal.
 */
export function usePasienRealtime(
  setPatients: (updater: (prev: Pasien[]) => Pasien[]) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel("realtime:pasien")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pasien" },
        (payload) => {
          setPatients((prev) => {
            const { eventType, new: newData, old: oldData } = payload as any;

            switch (eventType) {
              case "INSERT":
                // Hindari duplikasi jika data sudah ada
                if (prev.some((p) => p.id === newData.id)) return prev;
                return [newData, ...prev];

              case "UPDATE":
                return prev.map((p) => (p.id === newData.id ? newData : p));

              case "DELETE":
                return prev.filter((p) => p.id !== oldData.id);

              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setPatients]);
}

"use client";

import { useEffect, useRef } from "react";

import type { TindakanJoinResult } from "../bridge/mapping.types";
import { isReadyForAutoStatusSelesai } from "@/lib/tindakan/autoStatusSelesai";

/**
 * Sinkronkan status Selesai untuk semua baris yang dokter+tindakan+ruangan sudah terisi.
 * Memanggil API bulk sekali per mount daftar + setelah data list berubah (debounce).
 */
export function useTindakanAutoSelesaiSync(
  rows: readonly TindakanJoinResult[],
  onSynced?: () => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  const lastLocalSigRef = useRef("");

  useEffect(() => {
    const localNeed = rows.filter((r) =>
      isReadyForAutoStatusSelesai(r as unknown as Record<string, unknown>),
    );
    const sig = `${rows.length}:${localNeed.map((r) => r.id).join(",")}`;
    if (sig === lastLocalSigRef.current || runningRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void (async () => {
        runningRef.current = true;
        try {
          const res = await fetch("/api/tindakan/auto-selesai-sync", {
            method: "POST",
            credentials: "include",
          });
          const json = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            updated?: number;
          };
          if (res.ok && json.ok && (json.updated ?? 0) > 0) {
            lastLocalSigRef.current = sig;
            onSynced?.();
          } else if (localNeed.length === 0) {
            lastLocalSigRef.current = sig;
          }
        } catch {
          /* silent — sync opsional */
        } finally {
          runningRef.current = false;
        }
      })();
    }, 1200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [rows, onSynced]);
}

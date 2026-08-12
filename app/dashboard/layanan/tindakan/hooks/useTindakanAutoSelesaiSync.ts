"use client";

import { useEffect, useRef } from "react";

import type { TindakanJoinResult } from "../bridge/mapping.types";
import { isReadyForAutoStatusSelesai } from "@/lib/tindakan/autoStatusSelesai";

const MAX_IDS_PER_SYNC = 200;

/**
 * Sinkronkan status Selesai untuk baris di list yang dokter+tindakan+ruangan sudah terisi.
 * Hanya mengirim id kandidat (tanpa full-table scan di server).
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
    const ids = localNeed
      .map((r) => String(r.id ?? "").trim())
      .filter(Boolean)
      .slice(0, MAX_IDS_PER_SYNC);
    const sig = `${rows.length}:${ids.join(",")}`;
    if (sig === lastLocalSigRef.current || runningRef.current) return;

    if (ids.length === 0) {
      lastLocalSigRef.current = sig;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void (async () => {
        runningRef.current = true;
        try {
          const res = await fetch("/api/tindakan/auto-selesai-sync", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          });
          const json = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            updated?: number;
          };
          if (res.ok && json.ok) {
            lastLocalSigRef.current = sig;
            if ((json.updated ?? 0) > 0) onSynced?.();
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

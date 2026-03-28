"use client";

import { useMemo } from "react";

import type { TindakanJoinResult } from "../bridge/mapping.types";

function todayWibYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function tanggalKey(raw: unknown): string {
  if (raw == null || raw === "") return "";
  return String(raw).slice(0, 10);
}

/**
 * Statistik ringkas dari snapshot daftar tindakan yang sama dengan tabel
 * (menghindari query Supabase kedua dan selaras dengan limit API).
 */
export function useTindakanStatsFromList(
  rows: readonly TindakanJoinResult[],
  dataLoading: boolean,
) {
  const stats = useMemo(() => {
    const today = todayWibYmd();
    let hariIni = 0;
    for (const r of rows) {
      if (tanggalKey(r.tanggal) === today) hariIni += 1;
    }
    return {
      Total: rows.length,
      "Hari ini": hariIni,
    } as Record<string, number>;
  }, [rows]);

  return { stats, loading: dataLoading };
}

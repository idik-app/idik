"use client";

import { useMemo } from "react";

import type { TindakanJoinResult } from "../bridge/mapping.types";
import { resolveJenisKelaminFromRow } from "../lib/displayTindakanRow";

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

/** Nilai awal KPI sebelum tabel mengirim snapshot terfilter. */
export function emptyTindakanKpiStats(): Record<string, number> {
  return {
    "Pasien hari ini": 0,
    "Total pasien": 0,
    "Total tindakan": 0,
    "Total dokter": 0,
  };
}

/**
 * KPI kartu ringkasan dari baris tindakan (mis. hasil filter yang sama dengan tabel).
 */
export function computeTindakanStatsFromRows(
  rows: readonly TindakanJoinResult[],
): Record<string, number> {
  const today = todayWibYmd();
  let tindakanHariIni = 0;
  // "TOTAL PASIEN" mengikuti kolom "No" di tabel (jumlah baris keseluruhan di snapshot terfilter).
  const totalPasien = rows.length;

  // "TOTAL TINDAKAN" dibuat berbeda: jumlah jenis/nama tindakan berbeda (kolom `tindakan`).
  const distinctTindakan = new Set<string>();
  const dokterKeys = new Set<string>();
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    if (tanggalKey(r.tanggal) === today) tindakanHariIni += 1;
    const td = String(r.tindakan ?? "").trim();
    if (td) distinctTindakan.add(td);

    const d = String(r.dokter ?? "").trim();
    if (d && d !== "—") dokterKeys.add(d);
  }
  return {
    "Pasien hari ini": tindakanHariIni,
    "Total pasien": totalPasien,
    "Total tindakan": distinctTindakan.size,
    "Total dokter": dokterKeys.size,
  };
}

/** Hitung gender (L/P) berdasarkan kolom `jenis_kelamin` pada baris yang sama dengan tabel. */
export function computeTindakanGenderFromRows(
  rows: readonly TindakanJoinResult[],
): { laki: number; perempuan: number } {
  let laki = 0;
  let perempuan = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    const raw = r as unknown as Record<string, unknown>;
    const jk = resolveJenisKelaminFromRow(raw, null);
    if (jk === "L") laki += 1;
    else if (jk === "P") perempuan += 1;
  }
  return { laki, perempuan };
}

/**
 * Statistik dari snapshot penuh (tanpa filter tabel) — dipakai jika perlu di tempat lain.
 */
export function useTindakanStatsFromList(
  rows: readonly TindakanJoinResult[],
  dataLoading: boolean,
) {
  const stats = useMemo(
    () => computeTindakanStatsFromRows(rows),
    [rows],
  );

  return { stats, loading: dataLoading };
}

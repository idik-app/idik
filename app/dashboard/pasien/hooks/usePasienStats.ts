"use client";
import { useEffect, useState } from "react";
import { Pasien } from "../types/pasien";

/**
 * 📊 usePasienStats
 * Hitung statistik dasar pasien (total, hari ini, BPJS, umum, asuransi, kelas)
 */
export function usePasienStats(patients: Pasien[]) {
  const [stats, setStats] = useState({
    total: 0,
    hariIni: 0,
    bpjs: 0,
    umum: 0,
    asuransi: 0,
    kelas1: 0,
    kelas2: 0,
    kelas3: 0,
  });

  useEffect(() => {
    if (!patients?.length) return;

    const today = new Date().toLocaleDateString("id-ID");
    const total = patients.length;
    const hariIni = patients.filter(
      (p) =>
        p.created_at &&
        new Date(p.created_at).toLocaleDateString("id-ID") === today
    ).length;
    const bpjs = patients.filter((p) =>
      p.jenisPembiayaan?.includes("BPJS")
    ).length;
    const umum = patients.filter((p) => p.jenisPembiayaan === "Umum").length;
    const asuransi = patients.filter(
      (p) => p.jenisPembiayaan === "Asuransi"
    ).length;
    const kelas1 = patients.filter(
      (p) => p.kelasPerawatan === "Kelas 1"
    ).length;
    const kelas2 = patients.filter(
      (p) => p.kelasPerawatan === "Kelas 2"
    ).length;
    const kelas3 = patients.filter(
      (p) => p.kelasPerawatan === "Kelas 3"
    ).length;

    setStats({ total, hariIni, bpjs, umum, asuransi, kelas1, kelas2, kelas3 });
  }, [patients]);

  return stats;
}

"use client";

import { useEffect, useState } from "react";
import { Pasien } from "../types/pasien";

/* -------------------------------------------------------
   🧠 usePasienInsight v1.1 – Otonom Klinik Engine (Stable)
   Menggunakan created_at sebagai tanggal pendaftaran.
-------------------------------------------------------- */
export function usePasienInsight(patients: Pasien[]) {
  const [insight, setInsight] = useState<string>("Menganalisis data pasien...");
  const [trend, setTrend] = useState<{
    bpjs: number;
    umum: number;
    asuransi: number;
    kelasDominan: string;
    total: number;
    hariIni: number;
  }>({
    bpjs: 0,
    umum: 0,
    asuransi: 0,
    kelasDominan: "-",
    total: 0,
    hariIni: 0,
  });

  useEffect(() => {
    if (!patients || patients.length === 0) {
      setInsight("Belum ada data pasien.");
      return;
    }

    const total = patients.length;
    const today = new Date().toLocaleDateString("id-ID");

    // 🔹 Gunakan created_at untuk hitung pasien baru hari ini
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

    const kelasDominan =
      kelas1 > kelas2 && kelas1 > kelas3
        ? "Kelas 1"
        : kelas2 > kelas1 && kelas2 > kelas3
        ? "Kelas 2"
        : "Kelas 3";

    setTrend({ bpjs, umum, asuransi, kelasDominan, total, hariIni });

    // 🔹 Analisis naratif sederhana
    const bpjsPersen = ((bpjs / total) * 100).toFixed(1);
    const umumPersen = ((umum / total) * 100).toFixed(1);
    const asuransiPersen = ((asuransi / total) * 100).toFixed(1);

    let pesan = `Saat ini terdapat ${total} pasien terdaftar`;
    pesan += hariIni > 0 ? `, dengan ${hariIni} pasien baru hari ini.` : `.`;
    pesan += ` Distribusi pembiayaan: BPJS ${bpjsPersen}%, Umum ${umumPersen}%, dan Asuransi ${asuransiPersen}%.`;
    pesan += ` ${kelasDominan} menjadi kelas terbanyak.`;

    if (bpjs / total > 0.6) {
      pesan += " Tren menunjukkan dominasi pasien BPJS, siapkan slot tambahan.";
    } else if (umum / total > 0.4) {
      pesan += " Pasien umum meningkat signifikan minggu ini.";
    } else if (asuransi / total > 0.3) {
      pesan += " Asuransi swasta mulai aktif berpartisipasi.";
    }

    setInsight(pesan);
  }, [patients]);

  return { insight, trend };
}

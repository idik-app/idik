"use client";

import { useEffect, useState } from "react";
import { usePasien } from "../contexts/PasienContext";

/*───────────────────────────────────────────────
 🧠 usePasienInsight v6.3 – Autonomous Clinic Engine
   Analisis tren pasien real-time berdasarkan data context.
───────────────────────────────────────────────*/
export function usePasienInsight() {
  const { patients } = usePasien();

  const [insight, setInsight] = useState<string>("Menganalisis data pasien...");
  const [trend, setTrend] = useState<{
    bpjs: number;
    umum: number;
    asuransi: number;
    total: number;
    hariIni: number;
    usiaRata: number;
  }>({
    bpjs: 0,
    umum: 0,
    asuransi: 0,
    total: 0,
    hariIni: 0,
    usiaRata: 0,
  });

  useEffect(() => {
    if (!patients || patients.length === 0) {
      setInsight("Belum ada data pasien.");
      setTrend({
        bpjs: 0,
        umum: 0,
        asuransi: 0,
        total: 0,
        hariIni: 0,
        usiaRata: 0,
      });
      return;
    }

    const total = patients.length;
    const todayISO = new Date().toISOString().slice(0, 10);

    const hariIni = patients.filter(
      (p: any) =>
        (p.created_at || "").toString().slice(0, 10) === todayISO ||
        (p.updated_at || "").toString().slice(0, 10) === todayISO
    ).length;

    const bpjs = patients.filter((p) =>
      (p.jenisPembiayaan || "").toLowerCase().includes("bpjs")
    ).length;
    const umum = patients.filter(
      (p) => (p.jenisPembiayaan || "").toLowerCase() === "umum"
    ).length;
    const asuransi = patients.filter((p) =>
      (p.jenisPembiayaan || "").toLowerCase().includes("asuransi")
    ).length;

    const usiaRata = Math.round(
      patients.reduce((sum, p) => sum + (p.usia || 0), 0) / total
    );

    setTrend({ bpjs, umum, asuransi, total, hariIni, usiaRata });

    // 🔹 Analisis naratif sederhana
    const bpjsPersen = ((bpjs / total) * 100).toFixed(1);
    const umumPersen = ((umum / total) * 100).toFixed(1);
    const asuransiPersen = ((asuransi / total) * 100).toFixed(1);

    let pesan = `📊 Total ${total} pasien terdaftar`;
    pesan +=
      hariIni > 0
        ? `, dengan ${hariIni} pasien baru hari ini.`
        : `, belum ada pasien baru hari ini.`;
    pesan += ` Distribusi pembiayaan: BPJS ${bpjsPersen}%, Umum ${umumPersen}%, Asuransi ${asuransiPersen}%.`;
    pesan += ` Rata-rata usia pasien ${usiaRata} tahun. `;

    if (bpjs / total > 0.6) {
      pesan +=
        "Dominasi BPJS meningkat, pertimbangkan optimasi jadwal layanan.";
    } else if (umum / total > 0.4) {
      pesan += "Pasien umum meningkat signifikan minggu ini.";
    } else if (asuransi / total > 0.3) {
      pesan += "Pasien asuransi swasta mulai bertambah.";
    } else {
      pesan += "Distribusi pasien stabil tanpa dominasi signifikan.";
    }

    setInsight(pesan);
  }, [patients]);

  return { insight, trend };
}

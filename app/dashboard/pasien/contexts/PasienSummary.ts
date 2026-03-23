"use client";

import type { Pasien } from "../types/pasien";
import type { Summary } from "./PasienReducer";

/*───────────────────────────────────────────────
🔹 Hitung summary pasien
───────────────────────────────────────────────*/
export function calculateSummary(data: Pasien[] = []): Summary {
  const total = data.length;
  const male = data.filter(
    (p) => p.jenisKelamin === "L"
  ).length;
  const female = data.filter(
    (p) => p.jenisKelamin === "P"
  ).length;

  const now = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    total,
    male,
    female,
    growth: 0, // nanti bisa diisi tren mingguan
    lastSync: now,
  };
}

"use client";
/**
 * 💡 AboutSystem
 * --------------
 * Halaman filosofi sistem IDIK-App Regenerative Intelligence.
 */
import { HologramUI } from "../interface/ui/holographic/hologramUI";

export default function AboutSystem() {
  return (
    <HologramUI>
      <h1 className="text-2xl font-bold text-cyan-400 mb-4">
        IDIK-App Regenerative Intelligence (∞)
      </h1>
      <p className="text-gray-300 leading-relaxed">
        Sistem Cathlab otonom yang{" "}
        <span className="text-cyan-300">belajar, memperbaiki,</span> dan
        <span className="text-cyan-300"> berevolusi</span> untuk meningkatkan
        efisiensi klinis.
      </p>
      <p className="text-gray-400 mt-2">
        “Berpikir seperti manusia, bertindak seperti mesin, dan belajar dari
        kesalahan untuk menjadi lebih baik.”
      </p>
    </HologramUI>
  );
}

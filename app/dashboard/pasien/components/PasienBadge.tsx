"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, HeartPulse, Wallet, User } from "lucide-react";

/**
 * 🧠 PasienBadge v3.7
 * Komponen kecil untuk menampilkan status pasien secara visual.
 * Dapat dipakai di tabel, detail, atau kartu ringkas pasien.
 */

interface PasienBadgeProps {
  jenisPembiayaan?: string;
  jk?: string;
  kelas?: string;
}

export default function PasienBadge({
  jenisPembiayaan,
  jk,
  kelas,
}: PasienBadgeProps) {
  const genderColor =
    jk === "L"
      ? "from-cyan-700 to-cyan-400"
      : jk === "P"
      ? "from-pink-600 to-pink-400"
      : "from-gray-600 to-gray-400";

  const kelasColor =
    kelas === "1"
      ? "bg-gradient-to-r from-gold to-yellow-400 text-black"
      : kelas === "2"
      ? "bg-gradient-to-r from-cyan-600 to-cyan-400 text-white"
      : kelas === "3"
      ? "bg-gradient-to-r from-gray-700 to-gray-500 text-white"
      : "bg-gray-700 text-gray-200";

  const pembiayaanColor =
    jenisPembiayaan === "BPJS" || jenisPembiayaan === "NPBI"
      ? "border-cyan-500/60 text-cyan-300"
      : jenisPembiayaan === "Asuransi"
      ? "border-gold/60 text-gold"
      : "border-gray-500/60 text-gray-300";

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {jk && (
        <Badge
          className={`bg-gradient-to-r ${genderColor} border-none text-white flex items-center gap-1 shadow-md`}
        >
          <User size={12} />{" "}
          {jk === "L"
            ? "Laki-laki"
            : jk === "P"
            ? "Perempuan"
            : "Tidak Diketahui"}
        </Badge>
      )}

      {kelas && (
        <Badge
          className={`${kelasColor} border-none flex items-center gap-1 shadow-md`}
        >
          <Shield size={12} /> Kelas {kelas}
        </Badge>
      )}

      {jenisPembiayaan && (
        <Badge
          variant="outline"
          className={`${pembiayaanColor} border rounded-full flex items-center gap-1`}
        >
          {(jenisPembiayaan === "BPJS" || jenisPembiayaan === "NPBI") && (
            <HeartPulse size={12} />
          )}
          {jenisPembiayaan === "Asuransi" && <Wallet size={12} />}
          {jenisPembiayaan === "Umum" && <Wallet size={12} />}
          {jenisPembiayaan}
        </Badge>
      )}
    </div>
  );
}

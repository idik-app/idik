"use client";

import { X } from "lucide-react";
import { Pasien } from "../types/pasien";
import { formatKelasPerawatanDisplay } from "../utils/formatKelasPerawatan";
import ModalWrapper from "@/components/global/ModalWrapper";

/* -------------------------------------------------------------
 * 👁️ PatientDetailModal – Cathlab JARVIS Mode v4.5 (Cleaned)
 * Menggunakan ModalWrapper yang sudah direvisi
 * -------------------------------------------------------------- */

interface PatientDetailModalProps {
  patient: Pasien | null;
  onClose: () => void;
}

// Named export untuk mitigasi konflik bundling
export function PatientDetailModalContent({
  patient,
  onClose,
}: PatientDetailModalProps) {
  if (!patient) return null;

  return (
    <ModalWrapper onClose={onClose}>
      <div
        className="relative overflow-hidden bg-gradient-to-br from-cyan-900/40 to-black/70
                   border border-cyan-400/50 rounded-2xl p-6 w-full max-w-lg
                   text-cyan-100 shadow-[0_0_40px_rgba(0,255,255,0.5)]
                   animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
          {/* Tombol Tutup */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-yellow-400 hover:text-yellow-300 transition z-10"
          >
            <X size={22} />
          </button>

          {/* Judul */}
          <h3 className="text-2xl font-semibold text-yellow-400 drop-shadow-[0_0_12px_rgba(255,215,0,0.7)] mb-4 text-center relative z-10">
            👁️ Detail Pasien
          </h3>

          {/* Informasi Pasien */}
          <div className="space-y-2 text-sm relative z-10">
            <Info label="No. RM" value={patient.noRM} />
            <Info label="Nama" value={patient.nama} />
            <Info
              label="Jenis Kelamin"
              value={patient.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
            />
            <Info
              label="Tanggal Lahir"
              value={
                patient.tanggalLahir
                  ? new Date(patient.tanggalLahir).toLocaleDateString("id-ID")
                  : "-"
              }
            />
            {patient.alamat && <Info label="Alamat" value={patient.alamat} />}
            {patient.noHP && <Info label="No. HP" value={patient.noHP} />}
            {patient.jenisPembiayaan && (
              <Info label="Jenis Pembiayaan" value={patient.jenisPembiayaan} />
            )}
            {patient.kelasPerawatan && (
              <Info
                label="Kelas Perawatan"
                value={formatKelasPerawatanDisplay(patient.kelasPerawatan)}
              />
            )}
            {patient.asuransi && (
              <Info label="Asuransi" value={patient.asuransi} />
            )}
          </div>

          {/* Tombol Tutup Bawah */}
          <div className="flex justify-center mt-6 relative z-10">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg border border-cyan-400/40 text-cyan-200 
                             hover:bg-cyan-400/20 hover:shadow-[0_0_14px_rgba(0,255,255,0.6)] 
                             transition"
            >
              ✖ Tutup
            </button>
          </div>
      </div>
    </ModalWrapper>
  );
}

// Default export terpisah
export default function PatientDetailModal(props: PatientDetailModalProps) {
  return <PatientDetailModalContent {...props} />;
}

/* 🔹 Komponen Info */
function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <p className="flex items-start gap-1">
      <span className="text-cyan-300 min-w-[9rem]">{label}:</span>
      <span className="font-mono text-white break-words">{value}</span>
    </p>
  );
}

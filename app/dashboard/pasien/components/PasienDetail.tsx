"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { Pasien } from "../types/pasien";
import { formatKelasPerawatanDisplay } from "../utils/formatKelasPerawatan";
import { usePasienCrud } from "../hooks/usePasienCrud";

/**
 * 🧠 PasienDetail v3.7
 * Modal read-only untuk menampilkan biodata lengkap pasien.
 * Tidak bisa edit/tambah. Terintegrasi dengan usePasienCrud.
 */

export default function PasienDetail() {
  const { selectedPatient, modalMode, setModalMode } = usePasienCrud();
  const isView = modalMode === "view";

  if (!isView || !selectedPatient) return null;

  const patient = selectedPatient as Pasien;

  return (
    <Dialog open={isView} onOpenChange={() => setModalMode(null)}>
      <DialogContent className="bg-gray-900/95 border border-cyan-500/30 text-white backdrop-blur-xl max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-gold text-xl">Detail Pasien</DialogTitle>
          <DialogDescription className="text-gray-400">
            Informasi biodata lengkap pasien IDIK.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          className="grid grid-cols-2 gap-4 mt-4 text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Info label="No. RM" value={patient.noRM} />
          <Info label="Nama" value={patient.nama} />
          <Info label="Jenis Kelamin" value={patient.jenisKelamin} />
          <Info label="Alamat" value={patient.alamat} />
          <Info label="No. HP" value={patient.noHP} />
          <Info label="Jenis Pembiayaan" value={patient.jenisPembiayaan} />
          <Info
            label="Kelas"
            value={formatKelasPerawatanDisplay(patient.kelasPerawatan)}
          />
          <Info label="Asuransi" value={patient.asuransi} />
          <Separator className="col-span-2 my-2 bg-cyan-800/40" />
          <Info
            label="Tanggal Registrasi"
            value={patient.created_at?.split("T")[0] || "-"}
          />
        </motion.div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => setModalMode(null)}
            className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/60 transition-all"
          >
            Tutup
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --- Subkomponen Info --- */
function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-cyan-400 text-xs uppercase tracking-wider">
        {label}
      </span>
      <span className="text-white text-sm truncate">{value || "-"}</span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useTindakanCrud } from "@/modules/tindakan/hooks/useTindakanCrud";

/**
 * 💠 ModalAddEdit v7.1 — Cathlab JARVIS Gold-Cyan Hybrid
 * ------------------------------------------------------
 * - Form untuk tambah / edit tindakan
 * - Efek hologram transparan
 * - Validasi sederhana dan animasi masuk/keluar halus
 */

export default function ModalAddEdit({
  isOpen,
  onClose,
  data,
  mode = "add",
}: {
  isOpen: boolean;
  onClose: () => void;
  data?: any;
  mode?: "add" | "edit";
}) {
  const { addTindakan, updateTindakan } = useTindakanCrud();
  const { show } = useNotification();

  const [form, setForm] = useState({
    tanggal: "",
    no_rm: "",
    nama_pasien: "",
    dokter: "",
    tindakan: "",
    status: "Menunggu",
    catatan: "",
  });

  useEffect(() => {
    if (mode === "edit" && data) setForm(data);
    else if (mode === "add")
      setForm({
        tanggal: new Date().toISOString().split("T")[0],
        no_rm: "",
        nama_pasien: "",
        dokter: "",
        tindakan: "",
        status: "Menunggu",
        catatan: "",
      });
  }, [mode, data]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.nama_pasien || !form.dokter || !form.tindakan) {
      show("⚠️ Harap isi semua kolom penting");
      return;
    }

    if (mode === "add") {
      const result = await addTindakan(form);
      if (result === "ok") {
        show("✅ Tindakan baru ditambahkan");
        onClose();
      } else show("⚠️ Gagal menambah tindakan");
    } else {
      const result = await updateTindakan(form.id, form);
      if (result === "ok") {
        show("✅ Data tindakan diperbarui");
        onClose();
      } else show("⚠️ Gagal memperbarui data");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      >
        <motion.div
          key="modal-addedit"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative w-full max-w-xl rounded-2xl border border-cyan-700/50 bg-gradient-to-br from-black/60 via-gray-900/80 to-cyan-950/50 shadow-[0_0_20px_rgba(0,255,255,0.2)] text-gray-200 p-6 overflow-hidden"
        >
          {/* Scan line */}
          <motion.div
            animate={{ x: ["0%", "100%"] }}
            transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60"
          />

          {/* Tombol Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-cyan-950/60 transition-colors"
          >
            <X className="w-5 h-5 text-cyan-300 hover:text-gold-400 transition-colors" />
          </button>

          {/* Judul */}
          <div className="mb-4 border-b border-cyan-900/40 pb-3">
            <h2 className="text-xl font-semibold text-cyan-300 drop-shadow-[0_0_8px_#00ffff88]">
              {mode === "add" ? "Tambah Tindakan" : "Edit Tindakan"}
            </h2>
            <p className="text-sm text-gray-400">
              Lengkapi data tindakan Cathlab
            </p>
          </div>

          {/* Form */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Input
              label="Tanggal"
              name="tanggal"
              type="date"
              value={form.tanggal}
              onChange={handleChange}
            />
            <Input
              label="Nomor RM"
              name="no_rm"
              value={form.no_rm}
              onChange={handleChange}
            />
            <Input
              label="Nama Pasien"
              name="nama_pasien"
              value={form.nama_pasien}
              onChange={handleChange}
            />
            <Input
              label="Dokter"
              name="dokter"
              value={form.dokter}
              onChange={handleChange}
            />
            <Input
              label="Tindakan"
              name="tindakan"
              value={form.tindakan}
              onChange={handleChange}
            />
            <Input
              label="Status"
              name="status"
              value={form.status}
              onChange={handleChange}
            />
            <Textarea
              label="Catatan"
              name="catatan"
              value={form.catatan}
              onChange={handleChange}
            />
          </div>

          {/* Footer */}
          <div className="mt-6 text-right border-t border-cyan-900/40 pt-4">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm rounded-md border border-cyan-700/60 text-cyan-300 hover:bg-cyan-900/40 transition-all mr-2"
            >
              {mode === "add" ? "Tambah" : "Simpan"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-gray-700/60 text-gray-400 hover:bg-gray-800/50 transition-all"
            >
              Batal
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* 🔹 Komponen Input & Textarea */
function Input({ label, name, value, onChange, type = "text" }: any) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="bg-transparent border border-cyan-900/40 focus:border-cyan-500 rounded-md px-3 py-2 text-cyan-200 text-sm outline-none transition-all"
      />
    </div>
  );
}

function Textarea({ label, name, value, onChange }: any) {
  return (
    <div className="col-span-2 flex flex-col">
      <label className="text-xs text-gray-400 mb-1">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        className="bg-transparent border border-cyan-900/40 focus:border-cyan-500 rounded-md px-3 py-2 text-cyan-200 text-sm outline-none transition-all resize-none"
      />
    </div>
  );
}

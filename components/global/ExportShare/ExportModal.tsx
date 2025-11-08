"use client";

/*
  ⚙️ ExportModal v3.4 – JARVIS Hybrid Export System
  -------------------------------------------------
  🔹 Menampilkan pilihan format & tujuan ekspor
  🔹 Terintegrasi penuh dengan exporters & senders
  🔹 Mendukung: PDF, Excel, JSON
  🔹 Tujuan: Download, Supabase, WhatsApp, Email
  🔹 Auto-naming file berdasarkan modul + tanggal
*/

import { motion } from "framer-motion";
import { useState } from "react";
import { exportToPDF } from "./exporters/pdfExporter";
import { exportToExcel } from "./exporters/excelExporter";
import { exportToJSON } from "./exporters/jsonExporter";
import { uploadToSupabase } from "./exporters/uploader/supabaseUploader";
import { sendWhatsAppMessage } from "./senders/whatsappSender";
import { sendEmail } from "./senders/emailSender";

export function ExportModal({
  isOpen,
  onClose,
  type,
  data,
}: {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  data: any[];
}) {
  const [format, setFormat] = useState<"PDF" | "Excel" | "JSON">("PDF");
  const [status, setStatus] = useState<string>("");

  if (!isOpen) return null;

  // 🔹 Helper membuat nama file otomatis
  const generateFileName = (ext: string) => {
    const date = new Date().toISOString().split("T")[0];
    return `IDIK_${type}_${date}.${ext}`;
  };

  // 🔹 Generate & ambil Blob dari hasil ekspor
  const generateFile = async (): Promise<Blob | null> => {
    switch (format) {
      case "PDF":
        return await exportToPDF(type, data, true);
      case "Excel":
        return await exportToExcel(type, data, true);
      case "JSON":
        return await exportToJSON(type, data, true);
      default:
        return null;
    }
  };

  // 🔸 Simpan lokal
  const handleDownload = async () => {
    const blob = await generateFile();
    if (!blob) return;
    const filename = generateFileName(format.toLowerCase());
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`📥 File disimpan ke perangkat (${filename})`);
  };

  // ☁️ Upload ke Supabase
  const handleUpload = async () => {
    const blob = await generateFile();
    if (!blob) return;
    const filename = generateFileName(format.toLowerCase());
    setStatus("☁️ Mengunggah ke Supabase...");
    const link = await uploadToSupabase(type, blob, filename);
    if (link) setStatus(`✅ Upload berhasil: ${link}`);
    else setStatus("❌ Upload gagal");
  };

  // 💬 Kirim WhatsApp
  const handleWhatsApp = async () => {
    const blob = await generateFile();
    if (!blob) return;
    const filename = generateFileName(format.toLowerCase());
    setStatus("💬 Mengunggah file untuk WhatsApp...");
    const link = await uploadToSupabase(type, blob, filename);
    if (link) {
      sendWhatsAppMessage(link, filename);
      setStatus(`✅ Link terkirim ke WhatsApp (${filename})`);
    } else setStatus("❌ Gagal kirim WA");
  };

  // ✉️ Kirim Email
  const handleEmail = async () => {
    const blob = await generateFile();
    if (!blob) return;
    const filename = generateFileName(format.toLowerCase());
    const link = await uploadToSupabase(type, blob, filename);
    if (link) {
      sendEmail(link, filename);
      setStatus(`✉️ Link email dibuka (${filename})`);
    } else setStatus("❌ Gagal kirim email");
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-black/40 border border-cyan-500/70 rounded-xl p-6 w-[420px] text-cyan-100 shadow-[0_0_25px_rgba(0,255,255,0.3)]"
      >
        <h2 className="text-xl font-bold text-yellow-400 mb-4 text-center drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">
          ⚙️ Ekspor & Kirim Data
        </h2>

        {/* Format Ekspor */}
        <label className="block text-sm mb-1 text-cyan-300">Format:</label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as any)}
          className="w-full p-2 mb-4 rounded bg-black/40 border border-cyan-500 text-cyan-200 focus:border-yellow-400 outline-none"
        >
          <option>PDF</option>
          <option>Excel</option>
          <option>JSON</option>
        </select>

        {/* Nama File Preview */}
        <p className="text-xs text-cyan-400 mb-4">
          Nama File:{" "}
          <span className="text-yellow-400">
            {generateFileName(format.toLowerCase())}
          </span>
        </p>

        {/* Tombol Aksi */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleUpload}
            className="p-2 bg-cyan-700 hover:bg-cyan-600 rounded transition-all"
          >
            ☁️ Upload ke Supabase
          </button>

          <button
            onClick={handleWhatsApp}
            className="p-2 bg-green-700 hover:bg-green-600 rounded transition-all"
          >
            💬 Kirim WhatsApp
          </button>

          <button
            onClick={handleEmail}
            className="p-2 bg-yellow-700 hover:bg-yellow-600 rounded transition-all"
          >
            ✉️ Kirim Email
          </button>

          <button
            onClick={handleDownload}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-all"
          >
            📥 Simpan ke Perangkat
          </button>
        </div>

        {/* Status Proses */}
        {status && (
          <p className="mt-3 text-xs text-center text-cyan-300 italic">
            {status}
          </p>
        )}

        {/* Tombol Tutup */}
        <button
          onClick={onClose}
          className="mt-4 w-full text-sm text-cyan-400 hover:text-yellow-400 transition-all"
        >
          ✖ Tutup
        </button>
      </motion.div>
    </motion.div>
  );
}

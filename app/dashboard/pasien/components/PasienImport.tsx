"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { usePasien } from "../contexts/PasienContext";
import { useNotification } from "@/app/contexts/NotificationContext";

/*───────────────────────────────────────────────
 📥 PasienImport — Import data pasien dari Excel/CSV ke Supabase
 Kombinasi spreadsheet + IDIK-App + Supabase
───────────────────────────────────────────────*/

type ImportResult = {
  ok: boolean;
  imported?: number;
  failed?: number;
  errors?: { row: number; noRM?: string; message: string }[];
  message?: string;
  error?: string;
};

export default function PasienImport() {
  const { refresh } = usePasien();
  const { show } = useNotification();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = ".xlsx,.xls,.csv";
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      show({ type: "warning", message: "Pilih file Excel atau CSV terlebih dahulu." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/pasien/import", {
        method: "POST",
        body: formData,
      });
      const data: ImportResult = await res.json();
      setResult(data);
      if (data.ok && (data.imported ?? 0) > 0) {
        show({
          type: "success",
          message: data.message ?? `${data.imported} pasien berhasil diimpor ke Supabase.`,
        });
        await refresh();
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      }
      if (!res.ok && data.error) {
        show({ type: "error", message: data.error });
      }
    } catch (err: any) {
      show({ type: "error", message: err?.message ?? "Gagal mengirim file." });
      setResult({ ok: false, error: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setOpen(false);
    setFile(null);
    setResult(null);
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-3 py-1 rounded-md
                   border border-cyan-500/50 text-cyan-300 hover:text-cyan-200
                   hover:border-cyan-400 transition-colors duration-300"
        title="Import dari Excel/CSV ke Supabase"
      >
        <Upload size={13} /> Import
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={close}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl border border-cyan-700/50 bg-cyan-950/95 shadow-xl shadow-cyan-500/10"
            >
              <div className="flex items-center justify-between p-4 border-b border-cyan-700/40">
                <h3 className="text-lg font-semibold text-cyan-200 flex items-center gap-2">
                  <FileSpreadsheet size={20} /> Import dari Spreadsheet
                </h3>
                <button
                  type="button"
                  onClick={close}
                  className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-600/30"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-sm text-cyan-300/90">
                  Upload file Excel (.xlsx, .xls) atau CSV. Data akan divalidasi dan disimpan ke Supabase (tabel pasien).
                </p>
                <p className="text-xs text-cyan-500">
                  Kolom yang didukung: No. RM, Nama, JK, Tanggal Lahir, Alamat, No. HP, Pembiayaan, Kelas, Asuransi.
                </p>

                <div className="flex flex-col gap-2">
                  <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    onChange={handleFileChange}
                    className="block w-full text-sm text-cyan-200 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-cyan-600/40 file:text-cyan-200 file:cursor-pointer"
                  />
                  {file && (
                    <span className="text-xs text-cyan-400">
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                {result && (
                  <div
                    className={`rounded-lg p-3 text-sm ${
                      result.ok
                        ? "bg-green-900/30 border border-green-600/40 text-green-200"
                        : "bg-amber-900/30 border border-amber-600/40 text-amber-200"
                    }`}
                  >
                    {result.ok ? (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                        <div>
                          <p>{result.message}</p>
                          {result.imported != null && (
                            <p className="mt-1 text-green-300">
                              Diimpor: {result.imported}
                              {result.failed != null && result.failed > 0 && (
                                <> · Gagal validasi: {result.failed}</>
                              )}
                            </p>
                          )}
                          {result.errors && result.errors.length > 0 && (
                            <ul className="mt-2 text-xs text-cyan-300 max-h-24 overflow-y-auto space-y-1">
                              {result.errors.slice(0, 10).map((e, i) => (
                                <li key={i}>
                                  Baris {e.row}: {e.message}
                                </li>
                              ))}
                              {result.errors.length > 10 && (
                                <li>... dan {result.errors.length - 10} error lainnya.</li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <p>{result.error ?? result.message ?? "Terjadi kesalahan."}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="px-3 py-1.5 rounded-md border border-cyan-600/40 text-cyan-300 hover:bg-cyan-600/20"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!file || loading}
                    className="px-3 py-1.5 rounded-md bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin rounded-full h-3 w-3 border border-cyan-300 border-t-transparent" />
                        Mengimpor...
                      </>
                    ) : (
                      <>
                        <Upload size={14} /> Impor ke Supabase
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

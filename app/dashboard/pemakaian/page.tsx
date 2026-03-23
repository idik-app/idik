"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Box,
  Activity,
  Filter,
  PlusCircle,
  ScanLine,
} from "lucide-react";

type PemakaianStatus =
  | "DRAFT"
  | "DIAJUKAN"
  | "MENUNGGU_VALIDASI"
  | "TERVERIFIKASI";

type PemakaianItem = {
  id: string;
  tanggal: string;
  pasien: string;
  dokter: string;
  depo: string;
  barang: string;
  distributor?: string;
  qtyRencana: number;
  qtyDipakai: number;
  tipe: "BARU" | "REUSE";
  status: PemakaianStatus;
};

/*───────────────────────────────────────────────
 ⚙️ PemakaianPage – Cathlab JARVIS Mode v4.0
   Resep Alkes • Pemakaian • Depo
───────────────────────────────────────────────*/
export default function PemakaianPage() {
  const [selectedStatus, setSelectedStatus] = useState<PemakaianStatus | "ALL">(
    "ALL"
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mode, setMode] = useState<"RESEP" | "PEMAKAIAN">("RESEP");

  // TODO: ganti dengan data dari Supabase / API
  const data: PemakaianItem[] = [
    {
      id: "ORD-001",
      tanggal: "2025-03-16 09:30",
      pasien: "Budi Santoso",
      dokter: "dr. Andi, SpJP",
      depo: "Depo Cathlab",
      barang: "Stent DES 3.0 x 28mm",
      distributor: "PT Alkes Sejahtera",
      qtyRencana: 2,
      qtyDipakai: 1,
      tipe: "BARU",
      status: "TERVERIFIKASI",
    },
    {
      id: "ORD-002",
      tanggal: "2025-03-16 10:15",
      pasien: "Siti Aminah",
      dokter: "dr. Rudi, SpJP",
      depo: "Depo Cathlab",
      barang: "Guidewire 0.014\"",
      distributor: "PT Kardiotek",
      qtyRencana: 1,
      qtyDipakai: 1,
      tipe: "REUSE",
      status: "MENUNGGU_VALIDASI",
    },
  ];

  const filteredData =
    selectedStatus === "ALL"
      ? data
      : data.filter((row) => row.status === selectedStatus);

  const totalHariIni = data.reduce((acc, row) => acc + row.qtyDipakai, 0);
  const totalBaru = data
    .filter((row) => row.tipe === "BARU")
    .reduce((acc, row) => acc + row.qtyDipakai, 0);
  const totalReuse = data
    .filter((row) => row.tipe === "REUSE")
    .reduce((acc, row) => acc + row.qtyDipakai, 0);

  return (
    <div className="p-6 text-cyan-200 space-y-6">
      {/* ── Header + Aksi Utama ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center gap-3 mb-2 justify-between"
      >
        <div className="flex items-center gap-3">
          <ClipboardList size={28} className="text-[#D4AF37]" />
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37] drop-shadow-[0_0_6px_#00ffff]">
              Pemakaian & Resep Alkes
            </h1>
            <p className="text-xs text-cyan-300/80">
              Terhubung dengan Depo Farmasi untuk stok & verifikasi.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-cyan-950/60 border border-cyan-700 text-xs">
            <button
              className={`px-3 py-1.5 rounded-full transition text-[11px] ${
                mode === "RESEP"
                  ? "bg-cyan-500/90 text-black font-semibold shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                  : "text-cyan-300 hover:bg-cyan-900/60"
              }`}
              onClick={() => setMode("RESEP")}
            >
              Mode Resep
            </button>
            <button
              className={`px-3 py-1.5 rounded-full transition text-[11px] ${
                mode === "PEMAKAIAN"
                  ? "bg-emerald-500/90 text-black font-semibold shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                  : "text-cyan-300 hover:bg-cyan-900/60"
              }`}
              onClick={() => setMode("PEMAKAIAN")}
            >
              Mode Pemakaian
            </button>
          </div>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-gradient-to-r from-[#D4AF37] to-emerald-400
                       text-xs font-semibold text-black shadow-[0_0_18px_rgba(250,204,21,0.6)]
                       hover:shadow-[0_0_24px_rgba(45,212,191,0.8)] transition"
          >
            <PlusCircle size={16} />
            {mode === "RESEP" ? "Buat Resep Alkes" : "Input Pemakaian"}
          </button>
        </div>
      </motion.div>

      {/* ── Statistik Ringkas ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: <Box size={22} className="text-[#D4AF37]" />,
            title: "Total Item Terpakai Hari Ini",
            value: totalHariIni.toString(),
            color: "text-white",
          },
          {
            icon: <Activity size={22} className="text-emerald-300" />,
            title: "Total Baru",
            value: totalBaru.toString(),
            color: "text-emerald-300",
          },
          {
            icon: <Activity size={22} className="text-rose-300" />,
            title: "Total Reuse",
            value: totalReuse.toString(),
            color: "text-rose-300",
          },
        ].map((c, i) => (
          <motion.div
            key={i}
            animate={{
              boxShadow: [
                "0 0 10px rgba(212,175,55,0.25), 0 0 20px rgba(0,224,255,0.1)",
                "0 0 18px rgba(212,175,55,0.45), 0 0 25px rgba(0,224,255,0.2)",
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="bg-gradient-to-br from-[#0B0F15]/95 to-[#101A24]/95 border border-[#D4AF37]/70 rounded-2xl p-4 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              {c.icon}
              <div>
                <h3 className="text-lg font-semibold text-[#D4AF37]">
                  {c.title}
                </h3>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Filter & Ringkasan Konteks ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-[#020617]/90 via-[#020617]/80 to-[#020617]/90
                   border border-cyan-800/70 rounded-2xl px-4 py-3 flex flex-wrap gap-3 items-center text-xs"
      >
        <div className="flex items-center gap-2 text-cyan-300">
          <Filter size={14} className="text-cyan-400" />
          <span className="font-semibold">Filter:</span>
          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as PemakaianStatus | "ALL")
            }
            className="bg-slate-950/60 border border-cyan-700/70 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <option value="ALL">Semua Status</option>
            <option value="DRAFT">Draft</option>
            <option value="DIAJUKAN">Diajukan</option>
            <option value="MENUNGGU_VALIDASI">Menunggu Validasi Depo</option>
            <option value="TERVERIFIKASI">Terverifikasi</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-cyan-400 ml-auto">
          <span className="px-2 py-0.5 rounded-full bg-cyan-900/60 border border-cyan-700/80">
            Mode aktif:{" "}
            <span className="font-semibold text-[#D4AF37]">{mode}</span>
          </span>
          <span className="hidden sm:inline text-cyan-500/80">
            Perawat / Depo input, Depo Farmasi memverifikasi.
          </span>
        </div>
      </motion.div>

      {/* ── Tabel Pemakaian / Resep ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-br from-[#0B0F15]/90 to-[#111B26]/90 border border-[#0EA5E9]/40 rounded-2xl p-4 backdrop-blur-md overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-cyan-200">
              {mode === "RESEP"
                ? "Daftar Resep / Order Alkes"
                : "Daftar Pemakaian Alkes"}
            </h2>
            <p className="text-[11px] text-cyan-400/80">
              Klik baris untuk melihat detail & proses di Depo Farmasi.
            </p>
          </div>

          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]
                       bg-slate-900/80 border border-cyan-600/70 text-cyan-200
                       hover:bg-slate-900 transition"
          >
            <ScanLine size={14} className="text-emerald-400" />
            Scan Barcode (HP)
          </button>
        </div>

        <div className="overflow-x-auto text-xs rounded-xl border border-slate-800/80">
          <table className="min-w-full divide-y divide-slate-800/80">
            <thead className="bg-slate-950/80">
              <tr>
                <Th>ID</Th>
                <Th>Tanggal</Th>
                <Th>Pasien</Th>
                <Th>Dokter</Th>
                <Th>Depo</Th>
                <Th>Barang</Th>
                <Th>Distributor</Th>
                <Th className="text-center">Qty Resep</Th>
                <Th className="text-center">Qty Dipakai</Th>
                <Th className="text-center">Tipe</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 bg-slate-950/40">
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-6 text-center text-cyan-500/70"
                  >
                    Belum ada data untuk filter/status ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-cyan-900/20 cursor-pointer transition"
                  >
                    <Td>{row.id}</Td>
                    <Td>{row.tanggal}</Td>
                    <Td>{row.pasien}</Td>
                    <Td>{row.dokter}</Td>
                    <Td>{row.depo}</Td>
                    <Td>{row.barang}</Td>
                    <Td>{row.distributor || "-"}</Td>
                    <Td className="text-center">{row.qtyRencana}</Td>
                    <Td className="text-center">{row.qtyDipakai}</Td>
                    <Td className="text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.tipe === "BARU"
                            ? "bg-emerald-900/60 text-emerald-300 border border-emerald-500/60"
                            : "bg-rose-900/60 text-rose-300 border border-rose-500/60"
                        }`}
                      >
                        {row.tipe}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge status={row.status} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Drawer / Panel Form (skeleton, belum tersambung backend) ── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="w-full sm:max-w-2xl max-h-[90vh] bg-slate-950/95 border border-cyan-700/70 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-cyan-100">
                  {mode === "RESEP"
                    ? "Buat Resep / Order Alkes"
                    : "Input Pemakaian Alkes"}
                </h3>
                <p className="text-[11px] text-cyan-400/80">
                  Skeleton form – siap disambungkan ke Supabase & Depo Farmasi.
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-xs text-cyan-300 hover:text-cyan-100"
              >
                Tutup
              </button>
            </div>

            <div className="px-4 py-3 space-y-3 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabeledField label="Pasien">
                  <input
                    placeholder="Cari / pilih pasien..."
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
                <LabeledField label="Dokter / Operator">
                  <input
                    placeholder="Cari / pilih dokter..."
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
                <LabeledField label="Depo">
                  <input
                    placeholder="Depo Cathlab / Depo Farmasi"
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
                <LabeledField label="Tanggal & Jam">
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-cyan-200">
                    Detail Barang Alkes
                  </h4>
                  <button className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-slate-900/80 border border-cyan-700/70 text-cyan-200 hover:bg-slate-900">
                    <ScanLine size={12} className="text-emerald-400" />
                    Scan Barcode
                  </button>
                </div>

                <div className="rounded-xl border border-slate-800/80 overflow-hidden">
                  <table className="min-w-full text-[11px]">
                    <thead className="bg-slate-950/90">
                      <tr>
                        <Th>Kode / Barcode</Th>
                        <Th>Nama Barang</Th>
                        <Th>Distributor</Th>
                        <Th className="text-center">Qty</Th>
                        <Th className="text-center">Tipe</Th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-950/40 divide-y divide-slate-900/80">
                      <tr>
                        <Td>
                          <input
                            placeholder="Scan / ketik barcode..."
                            className="w-full bg-transparent border border-slate-700/80 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                        </Td>
                        <Td>
                          <input
                            placeholder="Nama barang (autocomplete)"
                            className="w-full bg-transparent border border-slate-700/80 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                        </Td>
                        <Td>
                          <input
                            placeholder="Distributor / sumber"
                            className="w-full bg-transparent border border-slate-700/80 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                        </Td>
                        <Td className="text-center">
                          <input
                            type="number"
                            min={1}
                            className="w-16 bg-transparent border border-slate-700/80 rounded-md px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                        </Td>
                        <Td className="text-center">
                          <select
                            className="bg-slate-900/80 border border-slate-700/80 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            defaultValue="BARU"
                          >
                            <option value="BARU">Baru</option>
                            <option value="REUSE">Reuse</option>
                          </select>
                        </Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <LabeledField label="Catatan (opsional)">
                  <textarea
                    rows={2}
                    placeholder="Catatan klinis / instruksi ke Depo..."
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
                <div className="flex flex-col gap-2 text-[11px] text-cyan-300">
                  <span className="font-semibold text-cyan-200">
                    Ringkasan Singkat
                  </span>
                  <span>- Mode: {mode === "RESEP" ? "Resep / Order" : "Pemakaian Final"}</span>
                  <span>- Setelah tersimpan, Depo Farmasi dapat memverifikasi & koreksi stok.</span>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-800/80 flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-3 py-1.5 rounded-full text-xs border border-slate-700 text-cyan-200 hover:bg-slate-900/80"
              >
                Batal
              </button>
              <button
                className="px-4 py-1.5 rounded-full text-xs font-semibold
                           bg-gradient-to-r from-emerald-400 to-cyan-400
                           text-black shadow-[0_0_18px_rgba(34,211,238,0.6)] hover:shadow-[0_0_22px_rgba(34,211,238,0.9)]"
              >
                Simpan & Kirim ke Depo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2 text-left font-semibold text-[11px] uppercase tracking-wide text-cyan-300 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-3 py-2 align-top text-[11px] text-cyan-100 ${className}`}>
      {children}
    </td>
  );
}

function StatusBadge({ status }: { status: PemakaianStatus }) {
  const map: Record<
    PemakaianStatus,
    { label: string; className: string }
  > = {
    DRAFT: {
      label: "Draft",
      className:
        "bg-slate-900/70 text-slate-200 border border-slate-600/80",
    },
    DIAJUKAN: {
      label: "Diajukan",
      className:
        "bg-cyan-900/70 text-cyan-200 border border-cyan-500/70",
    },
    MENUNGGU_VALIDASI: {
      label: "Menunggu Validasi Depo",
      className:
        "bg-amber-900/70 text-amber-200 border border-amber-500/70",
    },
    TERVERIFIKASI: {
      label: "Terverifikasi",
      className:
        "bg-emerald-900/70 text-emerald-200 border border-emerald-500/70",
    },
  };

  const cfg = map[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-cyan-300">
      <span className="font-semibold text-cyan-200">{label}</span>
      {children}
    </label>
  );
}

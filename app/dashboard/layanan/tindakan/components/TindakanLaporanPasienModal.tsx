"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, ChevronLeft, ChevronRight, X, ChevronDown, Check } from "lucide-react";
import type { PasienOption } from "@/components/ui/pasien-combobox";
import { cn } from "@/lib/utils";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import type { WireframeTabId } from "../bridge/wireframeDrawerTabs";
import ReportExportActionBar from "./ReportExportActionBar";
import {
  buildPasienReportLookup,
  displayNamaPasien,
  displayRm,
  mergePasienMasterIntoRowForReport,
} from "../lib/displayTindakanRow";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import { tanggalBarisKeYmdWib } from "../lib/tanggalBarisWib";
import {
  buildPasienReportHtml,
  buildPasienReportWhatsAppText,
  downloadPasienReportExcel,
  formatPasienReportCell,
  ALL_COLUMNS_MAP,
} from "../lib/tindakanPasienReportTemplates";

const COLUMN_CATEGORIES = [
  {
    name: "Pasien",
    columns: [
      { key: "tanggal", label: "Tanggal & Waktu" },
      { key: "no_rm", label: "No. RM" },
      { key: "nama_pasien", label: "Nama Pasien" },
      { key: "jenis_kelamin", label: "Jenis Kelamin" },
      { key: "tgl_lahir", label: "Tgl Lahir" },
      { key: "umur", label: "Umur" },
      { key: "alamat", label: "Alamat" },
      { key: "no_telp", label: "No. Telp" },
      { key: "rs_perujuk", label: "RS Perujuk" },
    ]
  },
  {
    name: "Tindakan & Lokasi",
    columns: [
      { key: "ruangan", label: "Ruangan" },
      { key: "cath", label: "Cathlab Slot" },
      { key: "tindakan", label: "Tindakan / Prosedur" },
      { key: "kategori", label: "Kategori Tindakan" },
      { key: "temuan_pembuluh", label: "Temuan Pembuluh" },
      { key: "kesimpulan_laporan", label: "Kesimpulan Laporan" },
      { key: "plan_medis", label: "Plan Medis" },
      { key: "status", label: "Status" },
    ]
  },
  {
    name: "Tim Medis (Pihak Terlibat)",
    columns: [
      { key: "dokter", label: "Dokter Operator" },
      { key: "dokter_anestesi", label: "Dokter Anestesi" },
      { key: "ppds", label: "PPDS" },
      { key: "asisten", label: "Asisten" },
      { key: "sirkuler", label: "Sirkuler" },
      { key: "logger", label: "Logger" },
      { key: "pj_laporan", label: "PJ Laporan" },
    ]
  },
  {
    name: "Klinis & Fast-Track",
    columns: [
      { key: "diagnosa", label: "Diagnosa Klinis" },
      { key: "faktor_risiko", label: "Faktor Risiko" },
      { key: "severity_level", label: "Severity Level" },
      { key: "hasil_lab_ppm", label: "Hasil Lab PPM" },
      { key: "total_kontras", label: "Total Kontras" },
      { key: "pci_report_link", label: "PCI Report Link" },
      { key: "is_fast_track", label: "Status Fast-Track" },
      { key: "pasien_datang_igd", label: "Waktu Pasien Tiba IGD" },
      { key: "door_to_balloon", label: "Waktu Door-to-Balloon" },
      { key: "total_waktu_fast_track", label: "Total Waktu Fast-Track" },
      { key: "fast_track_sign_in", label: "Sign In Fast-Track" },
      { key: "fast_track_time_out", label: "Time Out Fast-Track" },
      { key: "fast_track_sign_out", label: "Sign Out Fast-Track" },
    ]
  },
  {
    name: "Radiologi",
    columns: [
      { key: "fluoro_time", label: "Fluoro Time" },
      { key: "dose", label: "Dose (Air Kerma)" },
      { key: "dap_dose", label: "DAP Dose" },
      { key: "kv", label: "kV" },
      { key: "ma", label: "mA" },
      { key: "accession_no", label: "Accession No" },
    ]
  },
  {
    name: "Farmasi / Depo (Logistik)",
    columns: [
      { key: "pemakaian", label: "Pemakaian Alkes (Semua)" },
      { key: "pemakaian_konsolidasi", label: "Alkes Konsolidasi" },
      { key: "pemakaian_non_konsolidasi", label: "Alkes Non-Konsolidasi" },
      { key: "pemakaian_stent", label: "Alkes Stent" },
      { key: "pemakaian_balloon", label: "Alkes Balloon" },
      { key: "pemakaian_lainnya", label: "Alkes Lainnya" },
      { key: "consumable_kelengkapan", label: "Kelengkapan Consumable" },
    ]
  },
  {
    name: "CSSD (Sterilisasi & Berkas)",
    columns: [
      { key: "berkas_laporan", label: "Berkas Laporan" },
      { key: "operan_ranap", label: "Operan Ranap" },
      { key: "asmed", label: "Asmed" },
      { key: "sjp", label: "SJP" },
    ]
  },
  {
    name: "Keuangan & Distributor (Billing)",
    columns: [
      { key: "pembiayaan", label: "Pembiayaan" },
      { key: "kelas_pembiayaan", label: "Kelas Pembiayaan" },
      { key: "tarif_tindakan", label: "Tarif Tindakan" },
      { key: "consumable", label: "Consumable" },
      { key: "total", label: "Perolehan BPJS" },
      { key: "krs", label: "Total KRS" },
      { key: "selisih", label: "Selisih Biaya" },
      { key: "billing_simrs", label: "Billing SIMRS" },
      { key: "resume_erm", label: "Resume e-RM" },
    ]
  },
  {
    name: "Sistem & Metadata (Tersembunyi / Audit)",
    columns: [
      { key: "id", label: "ID Tindakan (DB)" },
      { key: "pasien_id", label: "ID Pasien (DB)" },
      { key: "sheet_id", label: "ID Upload Sheet" },
      { key: "waktu", label: "Detail Jam Tindakan" },
      { key: "no", label: "No. Urutan Dokumen" },
      { key: "created_at", label: "Tanggal Dibuat" },
      { key: "updated_at", label: "Tanggal Diperbarui" },
      { key: "inserted_at", label: "Waktu Input Sistem" },
      { key: "status_keterangan", label: "Keterangan Status / Batal" },
      { key: "status_duplikat", label: "Status Duplikat" },
      { key: "kelas", label: "Kelas Perawatan" },
      { key: "lama_perawatan", label: "Lama Perawatan" },
      { key: "level", label: "Level" },
      { key: "perolehan", label: "Perolehan" },
      { key: "resume", label: "Resume Medis" },
      { key: "keterangan", label: "Keterangan" },
    ]
  }
];

interface ChecklistDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

function ChecklistDropdown({
  label,
  options,
  selectedValues,
  onChange,
}: ChecklistDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    return options.filter((opt) => opt.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const selectAll = () => {
    onChange(options);
  };

  const clearAll = () => {
    onChange([]);
  };

  const displayLabel =
    selectedValues.length === 0
      ? `Semua ${label}`
      : `${selectedValues.length} ${label} dipilih`;

  return (
    <div ref={containerRef} className="relative min-w-[130px] flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm transition active:scale-95",
          "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
          "dark:border-zinc-800 dark:bg-black dark:text-slate-300 dark:hover:bg-zinc-900"
        )}
      >
        <span className="truncate pr-1">{displayLabel}</span>
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-zinc-800 dark:bg-[#0c0f17]">
          <div className="relative mb-2 flex items-center">
            <Search size={12} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={`Cari ${label}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-full rounded-md border border-slate-200 bg-slate-50 pl-7 pr-2 text-[10px] outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5 text-[9px] font-bold text-indigo-600 dark:border-zinc-900">
            <button type="button" onClick={selectAll} className="hover:underline">
              Pilih Semua
            </button>
            <button type="button" onClick={clearAll} className="text-slate-400 hover:underline">
              Reset
            </button>
          </div>

          <div className="custom-scrollbar max-h-40 overflow-y-auto space-y-0.5 select-none">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleOption(opt)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[10px] font-medium transition hover:bg-slate-50 dark:hover:bg-zinc-900 dark:text-slate-200"
                  >
                    <div
                      className={cn(
                        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                        isChecked
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-300 bg-white dark:border-zinc-700 dark:bg-black"
                      )}
                    >
                      {isChecked && <Check size={10} strokeWidth={3} />}
                    </div>
                    <span className="truncate" title={opt}>{opt}</span>
                  </button>
                );
              })
            ) : (
              <div className="py-2 text-center text-[10px] italic text-slate-400">
                Tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ColumnsDropdownProps {
  visibleColumns: string[];
  onChange: (columns: string[]) => void;
}

function ColumnsDropdown({ visibleColumns, onChange }: ColumnsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      onChange(visibleColumns.filter((c) => c !== key));
    } else {
      onChange([...visibleColumns, key]);
    }
  };

  const applyPreset = (presetType: "default" | "klinis" | "logistik" | "keuangan" | "radiologi") => {
    let cols: string[] = [];
    switch (presetType) {
      case "default":
        cols = ["tanggal", "no_rm", "nama_pasien", "dokter", "tindakan", "pembiayaan", "status"];
        break;
      case "klinis":
        cols = ["tanggal", "no_rm", "nama_pasien", "dokter", "tindakan", "diagnosa", "severity_level", "temuan_pembuluh", "kesimpulan_laporan", "status"];
        break;
      case "logistik":
        cols = ["tanggal", "no_rm", "nama_pasien", "dokter", "tindakan", "pemakaian", "pemakaian_stent", "pemakaian_balloon", "pemakaian_konsolidasi", "pemakaian_non_konsolidasi", "consumable_kelengkapan"];
        break;
      case "keuangan":
        cols = ["tanggal", "no_rm", "nama_pasien", "dokter", "tindakan", "pembiayaan", "kelas_pembiayaan", "tarif_tindakan", "consumable", "total", "krs", "selisih", "billing_simrs", "resume_erm"];
        break;
      case "radiologi":
        cols = ["tanggal", "no_rm", "nama_pasien", "dokter", "tindakan", "fluoro_time", "dose", "dap_dose", "kv", "ma", "accession_no"];
        break;
    }
    onChange(cols);
  };

  const filteredCategories = useMemo(() => {
    return COLUMN_CATEGORIES.map((cat) => {
      const filteredCols = cat.columns.filter((col) =>
        col.label.toLowerCase().includes(search.toLowerCase()) ||
        col.key.toLowerCase().includes(search.toLowerCase())
      );
      return {
        ...cat,
        columns: filteredCols,
      };
    }).filter((cat) => cat.columns.length > 0);
  }, [search]);

  const toggleCategory = (categoryName: string, enable: boolean) => {
    const category = COLUMN_CATEGORIES.find((c) => c.name === categoryName);
    if (!category) return;
    const catKeys = category.columns.map((col) => col.key);
    if (enable) {
      const nextCols = [...visibleColumns];
      catKeys.forEach((k) => {
        if (!nextCols.includes(k)) nextCols.push(k);
      });
      onChange(nextCols);
    } else {
      onChange(visibleColumns.filter((k) => !catKeys.includes(k)));
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-[150px] flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border px-3 py-1.5 text-xs font-bold shadow-sm transition active:scale-95",
          "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
          "dark:border-zinc-800 dark:bg-black dark:text-slate-300 dark:hover:bg-zinc-900"
        )}
      >
        <span>Kolom Tabel ({visibleColumns.length})</span>
        <ChevronDown size={14} className="shrink-0 text-slate-400 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xl dark:border-zinc-800 dark:bg-[#0c0f17]">
          <div className="relative mb-2.5 flex items-center">
            <Search size={12} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama kolom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div className="mb-2.5 border-b border-slate-100 pb-2 dark:border-zinc-850">
            <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pilihan Cepat (Presets)</span>
            <div className="flex flex-wrap gap-1">
              {(["default", "klinis", "logistik", "keuangan", "radiologi"] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded bg-indigo-50 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="custom-scrollbar max-h-64 overflow-y-auto space-y-3.5 pr-0.5">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => {
                const catKeys = cat.columns.map((c) => c.key);
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between border-b border-slate-100/50 pb-0.5 dark:border-zinc-900">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate max-w-[160px]" title={cat.name}>{cat.name}</span>
                      <div className="flex gap-1.5 text-[8px] font-bold text-indigo-500 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat.name, true)}
                          className="hover:underline"
                        >
                          Pilih
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat.name, false)}
                          className="text-slate-400 hover:underline"
                        >
                          Sembunyikan
                        </button>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      {cat.columns.map((col) => {
                        const isChecked = visibleColumns.includes(col.key);
                        return (
                          <button
                            key={col.key}
                            type="button"
                            onClick={() => toggleColumn(col.key)}
                            className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[10px] font-medium transition hover:bg-slate-50 dark:hover:bg-zinc-900 dark:text-slate-200"
                          >
                            <div
                              className={cn(
                                "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                                isChecked
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-slate-300 bg-white dark:border-zinc-700 dark:bg-black"
                              )}
                            >
                              {isChecked && <Check size={10} strokeWidth={3} />}
                            </div>
                            <span className="truncate" title={col.label}>{col.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-2 text-center text-[10px] italic text-slate-400">
                Tidak ditemukan kolom
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getCurrentMonthRangeWib(): { from: string; to: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  if (!y || !m) return { from: "", to: "" };
  const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getTabIdForColumnKey(key: string): WireframeTabId {
  switch (key) {
    case "no_rm":
    case "nama_pasien":
    case "jenis_kelamin":
    case "tgl_lahir":
    case "umur":
    case "alamat":
    case "no_telp":
    case "rs_perujuk":
      return "pasien";

    case "is_fast_track":
    case "pasien_datang_igd":
    case "door_to_balloon":
    case "total_waktu_fast_track":
    case "fast_track_sign_in":
    case "fast_track_time_out":
    case "fast_track_sign_out":
      return "fast_track";

    case "tanggal":
    case "tanggal_tindakan":
    case "tindakan":
    case "kategori":
    case "status":
    case "temuan_pembuluh":
    case "kesimpulan_laporan":
    case "plan_medis":
      return "tindakan";

    case "ruangan":
    case "cath":
      return "lokasi";

    case "dokter":
    case "dokter_anestesi":
    case "ppds":
    case "asisten":
    case "sirkuler":
    case "logger":
    case "pj_laporan":
      return "tim";

    case "fluoro_time":
    case "dose":
    case "dap_dose":
    case "kv":
    case "ma":
    case "accession_no":
    case "total_kontras":
      return "radiologi";

    case "pci_report_link":
    case "diagnosa":
    case "faktor_risiko":
    case "severity_level":
    case "hasil_lab_ppm":
      return "klinis";

    case "pembiayaan":
    case "kelas_pembiayaan":
    case "tarif_tindakan":
    case "total":
    case "krs":
    case "selisih":
    case "consumable":
    case "pemakaian":
    case "pemakaian_konsolidasi":
    case "pemakaian_non_konsolidasi":
    case "pemakaian_stent":
    case "pemakaian_balloon":
    case "pemakaian_lainnya":
    case "billing_simrs":
      return "biaya";

    case "berkas_laporan":
    case "operan_ranap":
    case "asmed":
    case "sjp":
    case "resume_erm":
    case "consumable_kelengkapan":
      return "kelengkapan";

    default:
      return "pasien";
  }
}

export default function TindakanLaporanPasienModal({
  open,
  onOpenChange,
  rows,
  pasienOptions = [],
  activeId,
  onOpenDetail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  pasienOptions?: readonly PasienOption[];
  activeId?: string | number;
  onOpenDetail?: (record: TindakanJoinResult, initialTab?: WireframeTabId) => void;
}) {
  const [filterTanggalFrom, setFilterTanggalFrom] = useState<string>(
    () => getCurrentMonthRangeWib().from
  );
  const [filterTanggalTo, setFilterTanggalTo] = useState<string>(
    () => getCurrentMonthRangeWib().to
  );
  const [selectedDokter, setSelectedDokter] = useState<string[]>([]);
  const [selectedTindakan, setSelectedTindakan] = useState<string[]>([]);
  const [selectedPembiayaan, setSelectedPembiayaan] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("idik_laporan_pasien_columns");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          // ignore
        }
      }
    }
    return ["tanggal", "no_rm", "nama_pasien", "dokter", "tindakan", "pembiayaan", "status"];
  });

  useEffect(() => {
    localStorage.setItem("idik_laporan_pasien_columns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const pasienLookup = useMemo(() => buildPasienReportLookup(pasienOptions), [pasienOptions]);

  const reportRows = useMemo(() => {
    return rows.map((r) => mergePasienMasterIntoRowForReport(r, pasienOptions, pasienLookup));
  }, [rows, pasienOptions, pasienLookup]);

  // Dynamic filter options generated from raw dataset
  const dokterOptions = useMemo(() => {
    const set = new Set<string>();
    reportRows.forEach((r) => {
      const d = (r.dokter || "").trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [reportRows]);

  const tindakanOptions = useMemo(() => {
    const set = new Set<string>();
    reportRows.forEach((r) => {
      const t = (r.tindakan || "").trim();
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [reportRows]);

  const pembiayaanOptions = useMemo(() => {
    const set = new Set<string>();
    reportRows.forEach((r) => {
      const p = r.kelas_pembiayaan || r.pembiayaan || "";
      const trimmed = p.trim();
      if (trimmed) set.add(trimmed);
    });
    return Array.from(set).sort();
  }, [reportRows]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    reportRows.forEach((r) => {
      const s = (r.status || "").trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [reportRows]);

  // Apply filters with useMemo to keep UI performant
  const filteredRows = useMemo(() => {
    let result = [...reportRows];

    if (filterTanggalFrom) {
      result = result.filter((r) => {
        const d = tanggalBarisKeYmdWib(r.tanggal);
        return d >= filterTanggalFrom;
      });
    }

    if (filterTanggalTo) {
      result = result.filter((r) => {
        const d = tanggalBarisKeYmdWib(r.tanggal);
        return d <= filterTanggalTo;
      });
    }

    if (selectedDokter.length > 0) {
      result = result.filter((r) => selectedDokter.includes(r.dokter || ""));
    }

    if (selectedTindakan.length > 0) {
      result = result.filter((r) => {
        const val = (r.tindakan || "").toLowerCase();
        return selectedTindakan.some((term) => val.includes(term.toLowerCase()));
      });
    }

    if (selectedPembiayaan.length > 0) {
      result = result.filter((r) => {
        const p = r.kelas_pembiayaan || r.pembiayaan || "";
        return selectedPembiayaan.includes(p.trim());
      });
    }

    if (selectedStatus.length > 0) {
      result = result.filter((r) => selectedStatus.includes(r.status || ""));
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((r) => {
        const nama = normalizeNamaPasien(displayNamaPasien(r as any)).toLowerCase();
        const rm = displayRm(r as any).toLowerCase();
        const dokter = (r.dokter || "").toLowerCase();
        const bayar = String(r.kelas_pembiayaan || r.pembiayaan || "").toLowerCase();
        const diagnosa = String(r.diagnosa || "").toLowerCase();
        const tindakan = String(r.tindakan || "").toLowerCase();
        return (
          nama.includes(lowerSearch) ||
          rm.includes(lowerSearch) ||
          dokter.includes(lowerSearch) ||
          bayar.includes(lowerSearch) ||
          diagnosa.includes(lowerSearch) ||
          tindakan.includes(lowerSearch)
        );
      });
    }

    return result;
  }, [
    reportRows,
    filterTanggalFrom,
    filterTanggalTo,
    selectedDokter,
    selectedTindakan,
    selectedPembiayaan,
    selectedStatus,
    searchTerm,
  ]);

  // Dashboard KPI card calculations (Memoized)
  const kpis = useMemo(() => {
    const totalTindakan = filteredRows.length;
    const uniquePasienRms = new Set(
      filteredRows.map((r) => displayRm(r as any)).filter(Boolean)
    );
    const totalPasien = uniquePasienRms.size;

    // Pembiayaan breakdown
    const bayarMap: Record<string, number> = {};
    filteredRows.forEach((r) => {
      const p = r.pembiayaan || "Lainnya";
      bayarMap[p] = (bayarMap[p] || 0) + 1;
    });
    const bayarSorted = Object.entries(bayarMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Status breakdown
    const statusMap: Record<string, number> = {};
    filteredRows.forEach((r) => {
      const s = r.status || "DRAFT";
      statusMap[s] = (statusMap[s] || 0) + 1;
    });

    return {
      totalPasien,
      totalTindakan,
      bayarSorted,
      statusMap,
    };
  }, [filteredRows]);

  // Pagination calculations (Memoized)
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterTanggalFrom,
    filterTanggalTo,
    selectedDokter,
    selectedTindakan,
    selectedPembiayaan,
    selectedStatus,
    searchTerm,
    itemsPerPage,
  ]);

  // Export handlers
  const dateRangeLabel = useMemo(() => {
    const from = filterTanggalFrom || "Awal";
    const to = filterTanggalTo || "Akhir";
    return `${from} s.d. ${to}`;
  }, [filterTanggalFrom, filterTanggalTo]);

  const exportFileBase = useMemo(() => {
    const safeRange = `${filterTanggalFrom || "awal"}_ke_${filterTanggalTo || "akhir"}`;
    return `laporan-pasien-cathlab-${safeRange}`;
  }, [filterTanggalFrom, filterTanggalTo]);

  const buildHtml = useCallback(() => {
    return buildPasienReportHtml({
      dateRange: dateRangeLabel,
      rows: filteredRows,
      visibleColumns,
    });
  }, [dateRangeLabel, filteredRows, visibleColumns]);

  const buildWhatsAppText = useCallback(() => {
    const filters: string[] = [];
    if (selectedDokter.length > 0) filters.push(`Dokter: ${selectedDokter.join(", ")}`);
    if (selectedTindakan.length > 0) filters.push(`Tindakan: ${selectedTindakan.join(", ")}`);
    if (selectedPembiayaan.length > 0) filters.push(`Pembiayaan: ${selectedPembiayaan.join(", ")}`);
    if (selectedStatus.length > 0) filters.push(`Status: ${selectedStatus.join(", ")}`);
    if (searchTerm) filters.push(`Cari: "${searchTerm}"`);

    return buildPasienReportWhatsAppText({
      dateRange: dateRangeLabel,
      rows: filteredRows,
      activeFilters: filters,
    });
  }, [dateRangeLabel, filteredRows, selectedDokter, selectedTindakan, selectedPembiayaan, selectedStatus, searchTerm]);

  const handleDownloadExcel = useCallback(() => {
    downloadPasienReportExcel({
      dateRange: dateRangeLabel,
      rows: filteredRows,
      filename: exportFileBase,
      visibleColumns,
    });
  }, [dateRangeLabel, filteredRows, exportFileBase, visibleColumns]);

  const handleCellClick = useCallback((rec: TindakanJoinResult, colKey: string) => {
    if (onOpenDetail) {
      const tabId = getTabIdForColumnKey(colKey);
      onOpenDetail(rec, tabId);
    }
  }, [onOpenDetail]);

  const mountPoint =
    typeof document !== "undefined"
      ? (document.fullscreenElement as HTMLElement) || document.body
      : null;

  if (!open || !mountPoint) return null;

  const content = (
    <AnimatePresence>
      <div
        className={cn("fixed inset-0 pointer-events-none", UI_LAYERS.drawerPortal)}
        style={{ zIndex: Z_INDEX_VALUES.drawerPortal }}
      >
        {/* Overlay backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-[#2D3748]/45 pointer-events-auto"
        />

        {/* Modal content */}
        <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none px-2 sm:px-4">
          <motion.div
            role="dialog"
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: "spring", damping: 22, stiffness: 380 }}
            className={cn(
              "pointer-events-auto flex h-[85vh] max-h-[85vh] min-w-0 w-full max-w-[90rem] cursor-default flex-col rounded-2xl border antialiased",
              "border-slate-200 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-[#0c0f17]",
              "font-[family-name:Inter,ui-sans-serif,system-ui,sans-serif]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
              {/* Navy header — selaras drawer detail tindakan */}
              <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-[#1B2B44] to-[#2D4A6E] px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                  <div className="space-y-1 text-left">
                    <h2 className="flex items-center gap-2 text-left text-base font-bold tracking-wide text-white sm:text-lg">
                      <Users className="shrink-0 text-amber-100" size={20} strokeWidth={2.25} />
                      Laporan Pasien Cathlab
                    </h2>
                    <p className="text-[11px] font-medium text-slate-300">
                      Dashboard & detail tabulasi pasien · klik baris untuk membuka detail drawer
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    {/* Action Bar (Print, WA, Excel) */}
                    <ReportExportActionBar
                      className="shrink-0 [&_button]:border-white/25 [&_button]:bg-white/10 [&_button]:text-white [&_button:hover]:bg-white/20"
                      empty={filteredRows.length === 0}
                      fileNameBase={exportFileBase}
                      buildHtml={buildHtml}
                      buildWhatsAppText={buildWhatsAppText}
                      onDownloadExcel={handleDownloadExcel}
                    />

                    {/* Date Pickers */}
                    <div className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-white">
                      <label className="flex items-center gap-1">
                        <span className="text-[9px] font-bold uppercase text-slate-300">Dari</span>
                        <input
                          type="date"
                          value={filterTanggalFrom}
                          onChange={(e) => setFilterTanggalFrom(e.target.value)}
                          className="bg-transparent text-[11px] font-semibold focus:outline-none [color-scheme:dark]"
                        />
                      </label>
                      <span className="text-slate-400">—</span>
                      <label className="flex items-center gap-1">
                        <span className="text-[9px] font-bold uppercase text-slate-300">S.d</span>
                        <input
                          type="date"
                          value={filterTanggalTo}
                          onChange={(e) => setFilterTanggalTo(e.target.value)}
                          className="bg-transparent text-[11px] font-semibold focus:outline-none [color-scheme:dark]"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "absolute right-3 top-3 rounded-lg border border-white/20 bg-white/10 p-1.5 text-slate-200 transition-all duration-200",
                    "hover:border-white/35 hover:bg-white/20 hover:text-white"
                  )}
                >
                  <X size={17} />
                  <span className="sr-only">Close</span>
                </button>
              </div>

              {/* Main dashboard content area */}
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4 bg-slate-50 dark:bg-zinc-950">
                {/* 1. KPI Cards Row */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
                  {/* Card 1: Total Pasien */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Pasien Unik
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-800 dark:text-white">
                        {kpis.totalPasien}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">Pasien</span>
                    </div>
                    <div className="mt-1.5 text-[9px] text-slate-400">
                      Berdasarkan nomor rekam medis
                    </div>
                  </div>

                  {/* Card 2: Total Tindakan */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Prosedur
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400">
                        {kpis.totalTindakan}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">Tindakan</span>
                    </div>
                    <div className="mt-1.5 text-[9px] text-slate-400">
                      Seluruh jenis prosedur terdaftar
                    </div>
                  </div>

                  {/* Card 3: Distribusi Pembiayaan */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Top Pembiayaan
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {kpis.bayarSorted.length > 0 ? (
                        kpis.bayarSorted.map(([type, count]) => {
                          const percent =
                            kpis.totalTindakan > 0 ? (count / kpis.totalTindakan) * 100 : 0;
                          return (
                            <div key={type} className="flex items-center justify-between text-[10px]">
                              <span className="font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
                                {type}
                              </span>
                              <span className="font-bold text-slate-800 dark:text-white">
                                {count} ({percent.toFixed(0)}%)
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[10px] italic text-slate-400 py-1">Tidak ada data</div>
                      )}
                    </div>
                  </div>

                  {/* Card 4: Distribusi Status */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status Tindakan
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Selesai:</span>
                        <span className="font-bold text-emerald-600">
                          {kpis.statusMap["SELESAI"] || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Terjadwal:</span>
                        <span className="font-bold text-blue-600">
                          {kpis.statusMap["TERJADWAL"] || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Draft:</span>
                        <span className="font-bold text-amber-600">
                          {kpis.statusMap["DRAFT"] || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Lainnya:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {Object.entries(kpis.statusMap).reduce(
                            (acc, [status, count]) =>
                              !["SELESAI", "TERJADWAL", "DRAFT"].includes(status)
                                ? acc + count
                                : acc,
                            0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Interactive Checklist Filters & Search */}
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 shrink-0">
                  <div className="relative flex-[2] min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari RM, nama pasien, dokter, atau tindakan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-indigo-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    />
                  </div>

                  {/* Checklist Popover Drops */}
                  <ChecklistDropdown
                    label="Dokter"
                    options={dokterOptions}
                    selectedValues={selectedDokter}
                    onChange={setSelectedDokter}
                  />

                  <ChecklistDropdown
                    label="Tindakan"
                    options={tindakanOptions}
                    selectedValues={selectedTindakan}
                    onChange={setSelectedTindakan}
                  />

                  <ChecklistDropdown
                    label="Pembiayaan"
                    options={pembiayaanOptions}
                    selectedValues={selectedPembiayaan}
                    onChange={setSelectedPembiayaan}
                  />

                  <ChecklistDropdown
                    label="Status"
                    options={statusOptions}
                    selectedValues={selectedStatus}
                    onChange={setSelectedStatus}
                  />

                  {/* Custom Columns Checklist Dropdown */}
                  <ColumnsDropdown
                    visibleColumns={visibleColumns}
                    onChange={setVisibleColumns}
                  />

                  {/* Reset button */}
                  {(selectedDokter.length > 0 ||
                    selectedTindakan.length > 0 ||
                    selectedPembiayaan.length > 0 ||
                    selectedStatus.length > 0 ||
                    searchTerm !== "") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDokter([]);
                        setSelectedTindakan([]);
                        setSelectedPembiayaan([]);
                        setSelectedStatus([]);
                        setSearchTerm("");
                      }}
                      className="h-9 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100 active:scale-95 shrink-0"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>

                {/* 3. Table of Patients */}
                <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full border-collapse text-left text-[11px]">
                      <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-zinc-700">
                        <tr>
                          <th className="px-3 py-2 text-center w-12 shrink-0">NO</th>
                          {visibleColumns.map((key) => (
                            <th key={key} className="px-3 py-2 whitespace-nowrap">
                              {ALL_COLUMNS_MAP[key] || key.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {paginatedRows.length > 0 ? (
                          paginatedRows.map((row, idx) => {
                            const isOdd = idx % 2 !== 0;
                            const isActive = activeId !== undefined && activeId !== null && String(row.id) === String(activeId);
                            return (
                              <tr
                                key={row.id || idx}
                                className={cn(
                                  "transition",
                                  isActive
                                    ? "bg-indigo-50/90 dark:bg-indigo-950/80"
                                    : (isOdd ? "bg-slate-50/40 dark:bg-zinc-900/30 hover:bg-indigo-50/30 dark:hover:bg-zinc-800/40" : "bg-white dark:bg-zinc-900 hover:bg-indigo-50/30 dark:hover:bg-zinc-800/40")
                                )}
                              >
                                <td
                                  onClick={() => handleCellClick(row, "no_rm")}
                                  className={cn(
                                    "cursor-pointer px-3 py-2.5 text-center font-bold shrink-0 transition-all duration-150",
                                    isActive
                                      ? "text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/90"
                                      : "text-slate-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800"
                                  )}
                                >
                                  {(currentPage - 1) * itemsPerPage + idx + 1}
                                </td>
                                {visibleColumns.map((key) => {
                                  const val = formatPasienReportCell(row, key);
                                  const isNamaOrRm = key === "nama_pasien" || key === "no_rm";
                                  const isStatus = key === "status";
                                  
                                  if (isStatus) {
                                    const isSelesai = String(val).toUpperCase() === "SELESAI";
                                    const isDraft = String(val).toUpperCase() === "DRAFT";
                                    const isTerjadwal = String(val).toUpperCase() === "TERJADWAL";
                                    return (
                                      <td
                                        key={key}
                                        onClick={() => handleCellClick(row, key)}
                                        className={cn(
                                          "cursor-pointer px-3 py-2.5 text-center whitespace-nowrap transition-all duration-150",
                                          isActive
                                            ? "bg-indigo-50/90 dark:bg-indigo-950/90"
                                            : "hover:bg-slate-200/50 dark:hover:bg-zinc-800"
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "inline-block rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide",
                                            isSelesai && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                                            isTerjadwal && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                                            isDraft && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                                            !isSelesai && !isTerjadwal && !isDraft && "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-300"
                                          )}
                                        >
                                          {val}
                                        </span>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td
                                      key={key}
                                      onClick={() => handleCellClick(row, key)}
                                      className={cn(
                                        "cursor-pointer px-3 py-2.5 max-w-[250px] truncate whitespace-normal leading-relaxed transition-all duration-150",
                                        isActive
                                          ? "bg-indigo-50/90 dark:bg-indigo-950/90 text-indigo-900 dark:text-indigo-200 font-semibold"
                                          : (isNamaOrRm ? "font-bold text-indigo-700 dark:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800" : "font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-zinc-800")
                                      )}
                                      title={val}
                                    >
                                      {val}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={visibleColumns.length + 1} className="px-3 py-8 text-center italic text-slate-400 dark:text-slate-500">
                              Tidak ada data pasien yang sesuai dengan filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 4. Table Pagination & Limit options */}
                  <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-zinc-850 dark:bg-zinc-900/60 rounded-b-xl text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Tampilkan:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none dark:border-zinc-850 dark:bg-black dark:text-slate-300"
                      >
                        <option value={10}>10 baris</option>
                        <option value={25}>25 baris</option>
                        <option value={50}>50 baris</option>
                        <option value={100}>100 baris</option>
                        <option value={500}>500 baris</option>
                        <option value={1000}>1000 baris (Single Page)</option>
                      </select>
                      <span className="text-slate-400 font-medium ml-2">
                        Total: <span className="font-bold text-slate-700 dark:text-slate-200">{filteredRows.length}</span> pasien
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">
                        Halaman <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> dari{" "}
                        <span className="font-bold text-slate-700 dark:text-slate-200">{totalPages || 1}</span>
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={currentPage === 1 || totalPages === 0}
                          onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                          className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-850 dark:bg-black dark:text-slate-400 dark:hover:bg-zinc-900"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={currentPage === totalPages || totalPages === 0}
                          onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                          className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-850 dark:bg-black dark:text-slate-400 dark:hover:bg-zinc-900"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );

  return createPortal(content, mountPoint);
}

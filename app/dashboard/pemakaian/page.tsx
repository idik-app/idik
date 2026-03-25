"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Activity,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  PlusCircle,
  Printer,
  ScanLine,
  Search,
  X,
} from "lucide-react";

import {
  DoctorCombobox,
  formatDoctorLabel,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";
import { DatetimeLocalPicker } from "@/components/ui/datetime-local-picker";

type PemakaianStatus =
  | "DRAFT"
  | "DIAJUKAN"
  | "MENUNGGU_VALIDASI"
  | "TERVERIFIKASI";

/** Satu baris struk: satu jenis alkes dalam order. */
type PemakaianLine = {
  lineId: string;
  barang: string;
  distributor?: string;
  qtyRencana: number;
  qtyDipakai: number;
  tipe: "BARU" | "REUSE";
};

/** Satu order = satu pasien / satu waktu resep — berisi banyak barang (seperti kasir). */
type PemakaianOrder = {
  id: string;
  tanggal: string;
  pasien: string;
  dokter: string;
  depo: string;
  status: PemakaianStatus;
  items: PemakaianLine[];
};

/** Role yang boleh memverifikasi dari sisi Depo / admin RS (sama dengan middleware portal depo). */
const DEPO_VERIFY_ROLES = new Set([
  "depo_farmasi",
  "depo",
  "farmasi",
  "pharmacy",
  "admin",
  "administrator",
  "superadmin",
]);

/** Level audit app_users: akun dengan role ini = operator/dokter yang login. */
const ROLE_DOKTER = "dokter";

const INITIAL_ORDERS: PemakaianOrder[] = [
  {
    id: "ORD-001",
    tanggal: "2025-03-16 09:30",
    pasien: "Budi Santoso",
    dokter: "dr. Andi, SpJP",
    depo: "Depo Cathlab",
    status: "TERVERIFIKASI",
    items: [
      {
        lineId: "ORD-001-A",
        barang: "Stent DES 3.0 x 28mm",
        distributor: "PT Alkes Sejahtera",
        qtyRencana: 2,
        qtyDipakai: 1,
        tipe: "BARU",
      },
      {
        lineId: "ORD-001-B",
        barang: "Guidewire 0.014\"",
        distributor: "PT Kardiotek",
        qtyRencana: 1,
        qtyDipakai: 1,
        tipe: "REUSE",
      },
    ],
  },
  {
    id: "ORD-002",
    tanggal: "2025-03-16 10:15",
    pasien: "Siti Aminah",
    dokter: "dr. Rudi, SpJP",
    depo: "Depo Cathlab",
    status: "MENUNGGU_VALIDASI",
    items: [
      {
        lineId: "ORD-002-A",
        barang: "Guidewire 0.014\"",
        distributor: "PT Kardiotek",
        qtyRencana: 1,
        qtyDipakai: 1,
        tipe: "REUSE",
      },
    ],
  },
  {
    id: "ORD-003",
    tanggal: "2025-03-16 11:00",
    pasien: "Ahmad Wijaya",
    dokter: "dr. Lisa, SpJP",
    depo: "Depo Cathlab",
    status: "DIAJUKAN",
    items: [
      {
        lineId: "ORD-003-A",
        barang: "Balloon NC 2.0 x 15mm",
        distributor: "PT Alkes Sejahtera",
        qtyRencana: 1,
        qtyDipakai: 1,
        tipe: "BARU",
      },
    ],
  },
  {
    id: "ORD-004",
    tanggal: "2025-03-16 13:20",
    pasien: "Dewi Lestari",
    dokter: "dr. Andi, SpJP",
    depo: "Depo Cathlab",
    status: "DRAFT",
    items: [
      {
        lineId: "ORD-004-A",
        barang: "Introducer 6F",
        distributor: "PT Kardiotek",
        qtyRencana: 1,
        qtyDipakai: 0,
        tipe: "BARU",
      },
    ],
  },
  {
    id: "ORD-005",
    tanggal: "2025-03-16 14:05",
    pasien: "Rina Kusuma",
    dokter: "dr. Rudi, SpJP",
    depo: "Depo Cathlab",
    status: "TERVERIFIKASI",
    items: [
      {
        lineId: "ORD-005-A",
        barang: "Stent DES 2.5 x 18mm",
        distributor: "PT Alkes Sejahtera",
        qtyRencana: 1,
        qtyDipakai: 1,
        tipe: "REUSE",
      },
    ],
  },
];

function sumQtyRencana(o: PemakaianOrder): number {
  return o.items.reduce((a, l) => a + l.qtyRencana, 0);
}

function sumQtyDipakai(o: PemakaianOrder): number {
  return o.items.reduce((a, l) => a + l.qtyDipakai, 0);
}

/** Satu tipe jika semua baris sama; jika campuran tampil label khusus. */
/** YYYY-MM-DD dari string tampilan (mis. "2025-03-16 09:30"). */
function orderTanggalDateKey(tanggal: string): string | null {
  const m = tanggal.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

/** Inklusif. `dari` / `sampai` kosong = tidak dibatasi di sisi itu. */
function orderTanggalInRange(
  tanggal: string,
  dari: string,
  sampai: string
): boolean {
  const key = orderTanggalDateKey(tanggal);
  const from = dari.trim();
  const to = sampai.trim();
  if (!from && !to) return true;
  if (!key) return false;
  let lo = from;
  let hi = to;
  if (lo && hi && lo > hi) {
    [lo, hi] = [hi, lo];
  }
  if (lo && key < lo) return false;
  if (hi && key > hi) return false;
  return true;
}

/*───────────────────────────────────────────────
 ⚙️ PemakaianPage – Cathlab JARVIS Mode v4.0
   Resep Alkes • Pemakaian • Depo
───────────────────────────────────────────────*/
export default function PemakaianPage() {
  const [selectedStatus, setSelectedStatus] = useState<PemakaianStatus | "ALL">(
    "ALL"
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mode, setMode] = useState<"RESEP" | "PEMAKAIAN">("PEMAKAIAN");
  const [orders, setOrders] = useState<PemakaianOrder[]>(INITIAL_ORDERS);
  const [role, setRole] = useState<string | null>(null);
  /** Username sesi (dari /api/auth/me); untuk akun level dokter dipakai sebagai nama dokter default. */
  const [sessionUsername, setSessionUsername] = useState<string | null>(null);
  const [drawerDokter, setDrawerDokter] = useState("");
  /** `yyyy-MM-dd'T'HH:mm` untuk form drawer (kalender + jam). */
  const [drawerDateTime, setDrawerDateTime] = useState("");
  const [doctorList, setDoctorList] = useState<DoctorOption[]>([]);
  const [doctorListLoading, setDoctorListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTanggalDari, setFilterTanggalDari] = useState("");
  const [filterTanggalSampai, setFilterTanggalSampai] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailRow, setDetailRow] = useState<PemakaianOrder | null>(null);
  const [detailDraft, setDetailDraft] = useState<PemakaianOrder | null>(null);

  function openOrderDetail(row: PemakaianOrder) {
    setDetailRow(row);
    setDetailDraft(structuredClone(row));
  }

  function closeOrderDetail() {
    setDetailRow(null);
    setDetailDraft(null);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeOrderDetail();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ok?: boolean; role?: string; username?: string }) => {
        if (!alive) return;
        if (j?.ok && typeof j.role === "string") {
          setRole(j.role.trim().toLowerCase());
        }
        if (j?.ok && typeof j.username === "string" && j.username.trim()) {
          setSessionUsername(j.username.trim());
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const isDokterSession = role === ROLE_DOKTER;

  useEffect(() => {
    if (!isDrawerOpen) return;
    let alive = true;
    setDoctorListLoading(true);
    fetch("/api/doctors", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ok?: boolean; doctors?: DoctorOption[] }) => {
        if (!alive) return;
        if (j?.ok && Array.isArray(j.doctors)) setDoctorList(j.doctors);
        else setDoctorList([]);
      })
      .catch(() => {
        if (alive) setDoctorList([]);
      })
      .finally(() => {
        if (alive) setDoctorListLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [isDrawerOpen]);

  /** Akun level dokter: cocokkan username login ke baris master `doctor` (nama persis). */
  useEffect(() => {
    if (!isDrawerOpen) return;
    if (!isDokterSession || !sessionUsername || doctorList.length === 0)
      return;
    const exact = doctorList.find(
      (d) =>
        d.nama_dokter.trim().toLowerCase() ===
        sessionUsername.trim().toLowerCase()
    );
    if (exact) setDrawerDokter(formatDoctorLabel(exact));
  }, [isDrawerOpen, isDokterSession, sessionUsername, doctorList]);

  function openPemakaianDrawer() {
    closeOrderDetail();
    setDrawerDokter("");
    setDrawerDateTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setIsDrawerOpen(true);
  }

  const canVerifyDepo = useMemo(
    () => (role != null ? DEPO_VERIFY_ROLES.has(role) : false),
    [role]
  );

  function verifyRow(orderId: string) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId && o.status === "MENUNGGU_VALIDASI"
          ? { ...o, status: "TERVERIFIKASI" as const }
          : o
      )
    );
    setDetailRow((d) => {
      if (!d || d.id !== orderId) return d;
      if (d.status !== "MENUNGGU_VALIDASI") return d;
      return { ...d, status: "TERVERIFIKASI" };
    });
    setDetailDraft((d) => {
      if (!d || d.id !== orderId) return d;
      if (d.status !== "MENUNGGU_VALIDASI") return d;
      return { ...d, status: "TERVERIFIKASI" };
    });
    // TODO: PATCH /api/pemakaian/:id/verify — sinkronkan ke Supabase
  }

  function cancelDetailEdit() {
    if (!detailRow) return;
    const fresh = orders.find((o) => o.id === detailRow.id);
    setDetailDraft(structuredClone(fresh ?? detailRow));
  }

  function saveDetailDraft() {
    if (!detailDraft) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === detailDraft.id ? detailDraft : o))
    );
    setDetailRow(detailDraft);
  }

  function addDetailLine() {
    if (!detailDraft) return;
    const suffix = Date.now().toString(36);
    setDetailDraft({
      ...detailDraft,
      items: [
        ...detailDraft.items,
        {
          lineId: `${detailDraft.id}-new-${suffix}`,
          barang: "",
          distributor: "",
          qtyRencana: 1,
          qtyDipakai: 0,
          tipe: "BARU",
        },
      ],
    });
  }

  function patchDetailLine(lineId: string, patch: Partial<PemakaianLine>) {
    setDetailDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        items: d.items.map((l) =>
          l.lineId === lineId ? { ...l, ...patch } : l
        ),
      };
    });
  }

  const trimmedSearch = searchQuery.trim().toLowerCase();

  const filteredData = useMemo(() => {
    let list = orders;
    if (selectedStatus !== "ALL") {
      list = list.filter((o) => o.status === selectedStatus);
    }
    if (filterTanggalDari || filterTanggalSampai) {
      list = list.filter((o) =>
        orderTanggalInRange(o.tanggal, filterTanggalDari, filterTanggalSampai)
      );
    }
    if (!trimmedSearch) return list;
    return list.filter((o) => {
      const statusText = STATUS_SEARCH_TEXT[o.status];
      const lineHay = o.items
        .map(
          (l) =>
            `${l.barang} ${l.distributor ?? ""} ${l.tipe} ${l.lineId}`.toLowerCase()
        )
        .join(" ");
      const hay = [
        o.id,
        o.tanggal,
        o.pasien,
        o.dokter,
        o.depo,
        statusText,
        lineHay,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(trimmedSearch);
    });
  }, [orders, selectedStatus, trimmedSearch, filterTanggalDari, filterTanggalSampai]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredData.length / pageSize) || 1
  );
  const safePage = Math.min(page, pageCount);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [selectedStatus, trimmedSearch, filterTanggalDari, filterTanggalSampai, pageSize]);

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount));
  }, [pageCount]);

  const rangeLabel = useMemo(() => {
    if (filteredData.length === 0) return "0 dari 0";
    const start = (safePage - 1) * pageSize + 1;
    const end = Math.min(safePage * pageSize, filteredData.length);
    return `${start}–${end} dari ${filteredData.length}`;
  }, [filteredData.length, safePage, pageSize]);

  function handlePrint() {
    window.print();
  }

  const totalHariIni = orders.reduce((acc, o) => acc + sumQtyDipakai(o), 0);
  const totalBaru = orders.reduce(
    (acc, o) =>
      acc + o.items.filter((l) => l.tipe === "BARU").reduce((a, l) => a + l.qtyDipakai, 0),
    0
  );
  const totalReuse = orders.reduce(
    (acc, o) =>
      acc + o.items.filter((l) => l.tipe === "REUSE").reduce((a, l) => a + l.qtyDipakai, 0),
    0
  );

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  @page { margin: 12mm; size: A4 landscape; }
}
`,
        }}
      />
      <div className="print:hidden min-h-full p-6 bg-[#000814] text-white space-y-6">
      {/* ── Header + Aksi Utama ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center gap-3 mb-2 justify-between"
      >
        <div className="flex items-center gap-3">
          <ClipboardList
            size={28}
            className="text-[#E8C547] drop-shadow-[0_0_10px_rgba(232,197,71,0.45)]"
          />
          <div>
            <h1 className="text-2xl font-bold text-[#E8C547] tracking-tight drop-shadow-[0_0_14px_rgba(232,197,71,0.35)]">
              Pemakaian & Resep Alkes
            </h1>
            <p className="text-xs text-white/85 mt-0.5">
              Terhubung dengan Depo Farmasi untuk stok & verifikasi.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tab pill: aktif = border putih + glow halus (neon dark) */}
          <div
            className="inline-flex rounded-full bg-black/50 border border-white/15 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            role="tablist"
            aria-label="Mode tampilan"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "RESEP"}
              className={`px-3.5 py-1.5 rounded-full transition text-[11px] font-medium ${
                mode === "RESEP"
                  ? "text-white border border-white/90 bg-white/[0.08] shadow-[0_0_16px_rgba(255,255,255,0.12)]"
                  : "text-white/40 border border-transparent hover:text-white/65"
              }`}
              onClick={() => setMode("RESEP")}
            >
              Mode Resep
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "PEMAKAIAN"}
              className={`px-3.5 py-1.5 rounded-full transition text-[11px] font-medium ${
                mode === "PEMAKAIAN"
                  ? "text-white border border-white/90 bg-white/[0.08] shadow-[0_0_16px_rgba(255,255,255,0.12)]"
                  : "text-white/40 border border-transparent hover:text-white/65"
              }`}
              onClick={() => setMode("PEMAKAIAN")}
            >
              Mode Pemakaian
            </button>
          </div>

          <button
            type="button"
            onClick={openPemakaianDrawer}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
                       bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#2dd4bf]
                       text-xs font-semibold text-[#0a0f18] shadow-[0_0_20px_rgba(232,197,71,0.45)]
                       hover:shadow-[0_0_26px_rgba(45,212,191,0.35)] transition"
          >
            <PlusCircle size={16} strokeWidth={2.25} />
            {mode === "RESEP" ? "Buat Resep Alkes" : "Input Pemakaian"}
          </button>
        </div>
      </motion.div>

      {/* ── Statistik Ringkas ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: <Box size={22} className="text-[#E8C547]" />,
            title: "Total Item Terpakai Hari Ini",
            value: totalHariIni.toString(),
            valueClass: "text-white",
            border: "border-[#E8C547]/55",
            glow: "shadow-[0_0_20px_rgba(232,197,71,0.12)]",
          },
          {
            icon: <Activity size={22} className="text-teal-400" />,
            title: "Total Baru",
            value: totalBaru.toString(),
            valueClass: "text-teal-300",
            border: "border-teal-500/45",
            glow: "shadow-[0_0_18px_rgba(45,212,191,0.1)]",
          },
          {
            icon: <Activity size={22} className="text-pink-400" />,
            title: "Total Reuse",
            value: totalReuse.toString(),
            valueClass: "text-pink-300",
            border: "border-pink-500/45",
            glow: "shadow-[0_0_18px_rgba(244,114,182,0.1)]",
          },
        ].map((c, i) => (
          <div
            key={i}
            className={`rounded-2xl p-4 bg-[#050b14]/90 border ${c.border} ${c.glow} backdrop-blur-sm`}
          >
            <div className="flex items-center gap-3">
              {c.icon}
              <div className="min-w-0">
                <h3 className="text-[13px] md:text-sm font-semibold text-[#E8C547] leading-snug">
                  {c.title}
                </h3>
                <p className={`text-2xl font-bold tabular-nums ${c.valueClass}`}>
                  {c.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter & pencarian ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-[#050b14]/95 border border-white/10 rounded-2xl px-4 py-3 flex flex-col gap-3 text-xs"
      >
        <div className="flex w-full items-center gap-2 rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5">
          <Search size={16} className="text-white/45 shrink-0" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID, pasien, dokter, barang, distributor, depo…"
            className="w-full min-w-0 bg-transparent text-[11px] text-white placeholder:text-white/35 focus:outline-none"
            aria-label="Cari tabel"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/55">
          <span className="px-2.5 py-1 rounded-full bg-black/35 border border-[#E8C547]/40 text-white/90">
            Mode aktif:{" "}
            <span className="font-semibold text-[#E8C547]">{mode}</span>
          </span>
          <span className="hidden sm:inline">
            Perawat / Depo input, Depo Farmasi memverifikasi.
          </span>
        </div>
      </motion.div>

      {/* ── Tabel Pemakaian / Resep ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-[#050b14]/95 border border-white/10 rounded-2xl p-4 overflow-hidden"
      >
        <div className="flex flex-col gap-3 mb-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#E8C547]">
              {mode === "RESEP"
                ? "Daftar Resep / Order Alkes"
                : "Daftar Pemakaian Alkes"}
            </h2>
            <p className="text-[11px] text-white/55 mt-0.5">
              {canVerifyDepo
                ? "Satu baris = satu order pasien. Klik untuk melihat rincian barang (struk). Verifikasi di kolom Status bila menunggu validasi Depo."
                : "Satu baris = satu order pasien. Klik untuk melihat rincian barang alkes yang dipakai (seperti struk kasir)."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0">
              <Filter size={14} className="text-white/55 shrink-0" aria-hidden />
              <span className="font-semibold text-white text-[11px]">Status</span>
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value as PemakaianStatus | "ALL")
                }
                className="bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:ring-2 focus:ring-[#E8C547]/50 min-w-[8.5rem]"
              >
                <option value="ALL">Semua Status</option>
                <option value="DRAFT">Draft</option>
                <option value="DIAJUKAN">Diajukan</option>
                <option value="MENUNGGU_VALIDASI">Menunggu Validasi Depo</option>
                <option value="TERVERIFIKASI">Terverifikasi</option>
              </select>
              <span className="font-semibold text-white text-[11px]">
                Periode
              </span>
              <label className="flex items-center gap-1.5 text-[10px] text-white/65">
                <span className="whitespace-nowrap">Dari</span>
                <input
                  type="date"
                  value={filterTanggalDari}
                  onChange={(e) => setFilterTanggalDari(e.target.value)}
                  className="bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:ring-2 focus:ring-[#E8C547]/50 [color-scheme:dark]"
                />
              </label>
              <label className="flex items-center gap-1.5 text-[10px] text-white/65">
                <span className="whitespace-nowrap">Sampai</span>
                <input
                  type="date"
                  value={filterTanggalSampai}
                  onChange={(e) => setFilterTanggalSampai(e.target.value)}
                  className="bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:ring-2 focus:ring-[#E8C547]/50 [color-scheme:dark]"
                />
              </label>
              {(filterTanggalDari || filterTanggalSampai) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterTanggalDari("");
                    setFilterTanggalSampai("");
                  }}
                  className="text-[10px] text-white/50 hover:text-[#E8C547] underline underline-offset-2"
                >
                  Reset periode
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]
                           bg-black/40 border border-white/20 text-white/95
                           hover:bg-white/5 hover:border-[#E8C547]/40 transition"
              >
                <Printer size={14} className="text-[#E8C547]" aria-hidden />
                Cetak
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto text-xs rounded-xl border border-white/[0.08]">
          <table className="min-w-full divide-y divide-white/[0.06]">
            <thead className="bg-[#0a1628]">
              <tr>
                <Th>ID</Th>
                <Th>Tanggal</Th>
                <Th>Pasien</Th>
                <Th>Dokter</Th>
                <Th>Depo</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] bg-[#000814]/80">
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-white/45"
                  >
                    Belum ada data untuk filter/pencarian ini.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openOrderDetail(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openOrderDetail(row);
                      }
                    }}
                    aria-label={`Buka detail order ${row.id}`}
                    className={[
                      "hover:bg-white/[0.06] cursor-pointer transition outline-none focus-visible:ring-2 focus-visible:ring-[#E8C547]/50 focus-visible:ring-inset",
                      detailRow?.id === row.id
                        ? "bg-white/[0.08] ring-1 ring-inset ring-[#E8C547]/35"
                        : "",
                    ].join(" ")}
                  >
                    <Td>{row.id}</Td>
                    <Td>{row.tanggal}</Td>
                    <Td>{row.pasien}</Td>
                    <Td>{row.dokter}</Td>
                    <Td>{row.depo}</Td>
                    <Td className="align-middle">
                      <div className="flex flex-wrap items-center gap-2 min-w-[140px]">
                        <StatusBadge status={row.status} />
                        {canVerifyDepo &&
                          row.status === "MENUNGGU_VALIDASI" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                verifyRow(row.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/70 bg-emerald-950/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.2)] hover:bg-emerald-900/90 hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                            >
                              <CheckCircle2
                                className="h-3 w-3 shrink-0"
                                aria-hidden
                              />
                              Verifikasi
                            </button>
                          )}
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
          <p className="text-[11px] text-white/55 tabular-nums">
            Menampilkan <span className="text-white/90">{rangeLabel}</span>
            {trimmedSearch ||
            selectedStatus !== "ALL" ||
            filterTanggalDari ||
            filterTanggalSampai
              ? " (terfilter)"
              : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-white/70">
              <span>Baris</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-black/40 border border-white/20 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-2 focus:ring-[#E8C547]/50"
              >
                {[5, 10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/40 text-white disabled:opacity-35 disabled:pointer-events-none hover:bg-white/5"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[72px] text-center text-[11px] text-white/80 tabular-nums">
                {safePage} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/40 text-white disabled:opacity-35 disabled:pointer-events-none hover:bg-white/5"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Panel detail baris (klik tabel) ── */}
      {detailRow && detailDraft && (
        <div
          className="fixed inset-0 z-[45] flex justify-end print:hidden"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            aria-label="Tutup detail"
            onClick={closeOrderDetail}
          />
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22 }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/15 bg-[#050b14] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pemakaian-detail-title"
          >
            <div className="flex items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
              <div>
                <h3
                  id="pemakaian-detail-title"
                  className="text-sm font-semibold text-[#E8C547]"
                >
                  Edit order
                </h3>
                <p className="text-[11px] text-white/50 mt-0.5 font-mono">
                  {detailRow.id}
                </p>
              </div>
              <button
                type="button"
                onClick={closeOrderDetail}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[11px]">
              <label className="block space-y-1">
                <span className="text-white/55">Tanggal</span>
                <input
                  type="text"
                  value={detailDraft.tanggal}
                  onChange={(e) =>
                    setDetailDraft((d) =>
                      d ? { ...d, tanggal: e.target.value } : d
                    )
                  }
                  className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                  placeholder="YYYY-MM-DD HH:mm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-white/55">Pasien</span>
                <input
                  type="text"
                  value={detailDraft.pasien}
                  onChange={(e) =>
                    setDetailDraft((d) =>
                      d ? { ...d, pasien: e.target.value } : d
                    )
                  }
                  className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-white/55">Dokter</span>
                <input
                  type="text"
                  value={detailDraft.dokter}
                  onChange={(e) =>
                    setDetailDraft((d) =>
                      d ? { ...d, dokter: e.target.value } : d
                    )
                  }
                  className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-white/55">Depo</span>
                <input
                  type="text"
                  value={detailDraft.depo}
                  onChange={(e) =>
                    setDetailDraft((d) =>
                      d ? { ...d, depo: e.target.value } : d
                    )
                  }
                  className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <DetailField
                  label="Total qty resep"
                  value={String(sumQtyRencana(detailDraft))}
                />
                <DetailField
                  label="Total qty dipakai"
                  value={String(sumQtyDipakai(detailDraft))}
                />
              </div>
              <div>
                <div className="text-[#E8C547] font-semibold mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span>Rincian barang (struk)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white/45 font-normal text-[10px]">
                      {detailDraft.items.length} jenis
                    </span>
                    <button
                      type="button"
                      onClick={addDetailLine}
                      className="inline-flex items-center gap-1 rounded-full border border-[#E8C547]/50 bg-[#E8C547]/10 px-2.5 py-1 text-[10px] font-semibold text-[#E8C547] hover:bg-[#E8C547]/20"
                    >
                      <PlusCircle className="h-3 w-3" aria-hidden />
                      Tambah
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 overflow-x-auto">
                  <table className="w-full text-[10px] min-w-[320px]">
                    <thead>
                      <tr className="bg-[#0a1628] text-white/80">
                        <th className="text-left font-semibold px-2 py-1.5 min-w-[100px]">
                          Barang
                        </th>
                        <th className="text-left font-semibold px-2 py-1.5 hidden sm:table-cell min-w-[80px]">
                          Dist.
                        </th>
                        <th className="text-center font-semibold px-1 py-1.5 w-12">
                          R
                        </th>
                        <th className="text-center font-semibold px-1 py-1.5 w-12">
                          U
                        </th>
                        <th className="text-center font-semibold px-1 py-1.5 w-[72px]">
                          Tipe
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {detailDraft.items.map((line) => (
                        <tr key={line.lineId} className="bg-black/20">
                          <td className="px-1.5 py-1 align-top">
                            <input
                              type="text"
                              value={line.barang}
                              onChange={(e) =>
                                patchDetailLine(line.lineId, {
                                  barang: e.target.value,
                                })
                              }
                              className="w-full min-w-[90px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white/95 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                            />
                          </td>
                          <td className="px-1.5 py-1 align-top hidden sm:table-cell">
                            <input
                              type="text"
                              value={line.distributor ?? ""}
                              onChange={(e) =>
                                patchDetailLine(line.lineId, {
                                  distributor: e.target.value || undefined,
                                })
                              }
                              className="w-full min-w-[70px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white/80 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                            />
                          </td>
                          <td className="px-1 py-1 align-top">
                            <input
                              type="number"
                              min={0}
                              value={line.qtyRencana}
                              onChange={(e) =>
                                patchDetailLine(line.lineId, {
                                  qtyRencana: Math.max(
                                    0,
                                    Number(e.target.value) || 0
                                  ),
                                })
                              }
                              className="w-full bg-black/50 border border-white/15 rounded px-1 py-1 text-center tabular-nums text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                            />
                          </td>
                          <td className="px-1 py-1 align-top">
                            <input
                              type="number"
                              min={0}
                              value={line.qtyDipakai}
                              onChange={(e) =>
                                patchDetailLine(line.lineId, {
                                  qtyDipakai: Math.max(
                                    0,
                                    Number(e.target.value) || 0
                                  ),
                                })
                              }
                              className="w-full bg-black/50 border border-white/15 rounded px-1 py-1 text-center tabular-nums text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                            />
                          </td>
                          <td className="px-1 py-1 align-top">
                            <select
                              value={line.tipe}
                              onChange={(e) =>
                                patchDetailLine(line.lineId, {
                                  tipe: e.target.value as PemakaianLine["tipe"],
                                })
                              }
                              className="w-full bg-black/50 border border-white/15 rounded px-0.5 py-1 text-[9px] text-white focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                            >
                              <option value="BARU">BARU</option>
                              <option value="REUSE">REUSE</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <div className="text-white/55 mb-1">Status order</div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={detailDraft.status} />
                  {canVerifyDepo &&
                    detailDraft.status === "MENUNGGU_VALIDASI" && (
                      <button
                        type="button"
                        onClick={() => verifyRow(detailDraft.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/70 bg-emerald-950/80 px-2.5 py-1 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-900/90"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        Verifikasi di Depo
                      </button>
                    )}
                </div>
              </div>
              <p className="text-[10px] text-white/40 pt-2 border-t border-white/10">
                Ubah data lalu Simpan ke daftar. Satu order dapat berisi banyak
                baris alkes; verifikasi Depo memproses seluruh order sekaligus.
              </p>
            </div>
            <div className="border-t border-white/10 px-4 py-3 flex flex-wrap gap-2 justify-end shrink-0">
              <button
                type="button"
                onClick={cancelDetailEdit}
                className="px-3 py-1.5 rounded-full text-[11px] border border-white/20 text-white/85 hover:bg-white/5"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveDetailDraft}
                className="px-4 py-1.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#2dd4bf] text-[#0a0f18] shadow-[0_0_14px_rgba(232,197,71,0.35)] hover:shadow-[0_0_18px_rgba(45,212,191,0.25)]"
              >
                Simpan
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Drawer / Panel Form (skeleton, belum tersambung backend) ── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="w-full sm:max-w-2xl max-h-[90vh] bg-[#050b14] border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#E8C547]">
                  {mode === "RESEP"
                    ? "Buat Resep / Order Alkes"
                    : "Input Pemakaian Alkes"}
                </h3>
                <p className="text-[11px] text-white/50">
                  Skeleton form – siap disambungkan ke Supabase & Depo Farmasi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="text-xs text-white/60 hover:text-white"
              >
                Tutup
              </button>
            </div>

            <div className="px-4 py-3 space-y-3 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabeledField label="Pasien">
                  <input
                    placeholder="Cari / pilih pasien..."
                    className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40"
                  />
                </LabeledField>
                <LabeledField label="Dokter / Operator">
                  <DoctorCombobox
                    value={drawerDokter}
                    onChange={setDrawerDokter}
                    options={doctorList}
                    loading={doctorListLoading}
                  />
                  <p className="text-[10px] text-white/45 mt-0.5">
                    {isDokterSession
                      ? "Daftar dari master Dokter; jika username sama dengan nama dokter, diisi otomatis."
                      : "Pilih dari master Dokter atau ketik untuk mencari."}
                  </p>
                </LabeledField>
                <LabeledField label="Depo">
                  <input
                    placeholder="Depo Cathlab / Depo Farmasi"
                    className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40"
                  />
                </LabeledField>
                <LabeledField label="Tanggal & Jam">
                  <DatetimeLocalPicker
                    value={drawerDateTime}
                    onChange={setDrawerDateTime}
                  />
                </LabeledField>
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-[#E8C547]">
                    Detail Barang Alkes
                  </h4>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-black/40 border border-white/15 text-white/90 hover:bg-white/5"
                  >
                    <ScanLine size={12} className="text-teal-400" />
                    Scan Barcode
                  </button>
                </div>

                <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                  <table className="min-w-full text-[11px]">
                    <thead className="bg-[#0a1628]">
                      <tr>
                        <Th>Kode / Barcode</Th>
                        <Th>Nama Barang</Th>
                        <Th>Distributor</Th>
                        <Th className="text-center">Qty</Th>
                        <Th className="text-center">Tipe</Th>
                      </tr>
                    </thead>
                    <tbody className="bg-[#000814]/60 divide-y divide-white/[0.06]">
                      <tr>
                        <Td>
                          <input
                            placeholder="Scan / ketik barcode..."
                            className="w-full bg-transparent border border-white/15 rounded-md px-2 py-1 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                          />
                        </Td>
                        <Td>
                          <input
                            placeholder="Nama barang (autocomplete)"
                            className="w-full bg-transparent border border-white/15 rounded-md px-2 py-1 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                          />
                        </Td>
                        <Td>
                          <input
                            placeholder="Distributor / sumber"
                            className="w-full bg-transparent border border-white/15 rounded-md px-2 py-1 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                          />
                        </Td>
                        <Td className="text-center">
                          <input
                            type="number"
                            min={1}
                            className="w-16 bg-transparent border border-white/15 rounded-md px-2 py-1 text-center text-white focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                          />
                        </Td>
                        <Td className="text-center">
                          <select
                            className="bg-black/40 border border-white/15 rounded-md px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
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
                    className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40"
                  />
                </LabeledField>
                <div className="flex flex-col gap-2 text-[11px] text-white/60">
                  <span className="font-semibold text-[#E8C547]">
                    Ringkasan Singkat
                  </span>
                  <span>- Mode: {mode === "RESEP" ? "Resep / Order" : "Pemakaian Final"}</span>
                  <span>- Setelah tersimpan, Depo Farmasi dapat memverifikasi & koreksi stok.</span>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-white/10 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-3 py-1.5 rounded-full text-xs border border-white/20 text-white/85 hover:bg-white/5"
              >
                Batal
              </button>
              <button
                type="button"
                className="px-4 py-1.5 rounded-full text-xs font-semibold
                           bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#2dd4bf]
                           text-[#0a0f18] shadow-[0_0_18px_rgba(232,197,71,0.35)] hover:shadow-[0_0_22px_rgba(45,212,191,0.25)]"
              >
                Simpan & Kirim ke Depo
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </div>

      {/* ── Versi cetak: semua baris hasil filter (bukan hanya halaman aktif) ── */}
      <div className="hidden print:block print:bg-white print:text-black print:p-4">
        <PemakaianPrintTable
          orders={filteredData}
          mode={mode}
          title={
            mode === "RESEP"
              ? "Daftar Resep / Order Alkes"
              : "Daftar Pemakaian Alkes"
          }
        />
      </div>
    </>
  );
}

const STATUS_SEARCH_TEXT: Record<PemakaianStatus, string> = {
  DRAFT: "draft",
  DIAJUKAN: "diajukan",
  MENUNGGU_VALIDASI: "menunggu validasi depo",
  TERVERIFIKASI: "terverifikasi",
};

function PemakaianPrintTable({
  orders,
  mode,
  title,
}: {
  orders: PemakaianOrder[];
  mode: "RESEP" | "PEMAKAIAN";
  title: string;
}) {
  const printedAt = new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="text-[10px] text-black">
      <h1 className="text-base font-bold text-black">IDIK-App — {title}</h1>
      <p className="text-gray-700 mt-1">
        Mode: {mode} · Dicetak: {printedAt} · Total order: {orders.length}
      </p>
      <table className="mt-3 w-full border-collapse border border-gray-400">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              ID Order
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Tanggal
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Pasien
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Dokter
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Depo
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="border border-gray-400 px-2 py-2 text-center text-gray-600"
              >
                Tidak ada data
              </td>
            </tr>
          ) : (
            orders.map((o) => (
              <tr key={o.id}>
                <td className="border border-gray-400 px-1.5 py-0.5">
                  {o.id}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5">
                  {o.tanggal}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5">
                  {o.pasien}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5">
                  {o.dokter}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5">
                  {o.depo}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5">
                  {STATUS_LABEL_PRINT[o.status]}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const STATUS_LABEL_PRINT: Record<PemakaianStatus, string> = {
  DRAFT: "Draft",
  DIAJUKAN: "Diajukan",
  MENUNGGU_VALIDASI: "Menunggu Validasi Depo",
  TERVERIFIKASI: "Terverifikasi",
};

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2.5 text-left font-semibold text-[11px] uppercase tracking-wide text-white/90 ${className}`}
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
    <td className={`px-3 py-2 align-top text-[11px] text-white ${className}`}>
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
        "bg-white/[0.06] text-white/80 border border-white/20",
    },
    DIAJUKAN: {
      label: "Diajukan",
      className:
        "bg-sky-950/80 text-sky-200 border border-sky-500/50",
    },
    MENUNGGU_VALIDASI: {
      label: "Menunggu Validasi Depo",
      className:
        "bg-orange-950/90 text-orange-200 border border-orange-400/60 shadow-[0_0_12px_rgba(251,146,60,0.15)]",
    },
    TERVERIFIKASI: {
      label: "Terverifikasi",
      className:
        "bg-emerald-950/90 text-emerald-200 border border-emerald-500/60 shadow-[0_0_12px_rgba(52,211,153,0.15)]",
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

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-white/55 mb-0.5">{label}</div>
      <div className="text-white/95">{value}</div>
    </div>
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
    <label className="flex flex-col gap-1 text-[11px] text-white/70">
      <span className="font-semibold text-white/90">{label}</span>
      {children}
    </label>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Activity,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Pencil,
  PlusCircle,
  ScanLine,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  DoctorCombobox,
  formatDoctorLabel,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";
import {
  PasienCombobox,
  formatPasienLabel,
  type PasienOption,
} from "@/components/ui/pasien-combobox";
import {
  RuanganCombobox,
  type RuanganOption,
} from "@/components/ui/ruangan-combobox";
import {
  BarangVariantCombobox,
  pickRowSearchHaystack,
  type MasterBarangPickRow,
} from "@/components/ui/barang-variant-combobox";
import { ConsumableAngiografiPrintTemplate } from "@/app/dashboard/pemakaian/components/ConsumableAngiografiTemplate";
import { useAppDialog } from "@/contexts/AppDialogContext";
import { PrintIcon } from "@/components/icons/PrintIcon";
import {
  normalizeTemplateInputBarang,
  type TemplateInputBarangPayload,
} from "@/lib/pemakaian/templateInputBarang";
import {
  RincianBarangTemplateTabs,
  type RincianBarangTab,
} from "@/app/dashboard/pemakaian/components/RincianBarangTemplateTabs";
import {
  TEMPLATE_KOMPONEN,
  TEMPLATE_OBAT_ALKES,
  type TemplateChecklistRow,
} from "@/app/dashboard/pemakaian/data/templateInputBarangRows";
import {
  loadKomponenRows,
  loadObatAlkesRows,
} from "@/app/dashboard/pemakaian/lib/templateLocalStorage";

const ScanBarcodeQRDialog = dynamic(
  () => import("@/app/dashboard/pemakaian/components/ScanBarcodeQRDialog"),
  { ssr: false },
);

const DatetimeLocalPicker = dynamic(
  () =>
    import("@/components/ui/datetime-local-picker").then(
      (m) => m.DatetimeLocalPicker,
    ),
  { ssr: false },
);

const TemplateBarangEditorDialog = dynamic(
  () =>
    import("@/app/dashboard/pemakaian/components/TemplateBarangEditorDialog").then(
      (m) => m.TemplateBarangEditorDialog,
    ),
  { ssr: false },
);

type PemakaianStatus =
  | "DRAFT"
  | "DIAJUKAN"
  | "MENUNGGU_VALIDASI"
  | "TERVERIFIKASI"
  | "SELESAI";

/** Urutan & label untuk dropdown Edit order & filter. */
const PEMAKAIAN_STATUS_OPTIONS: { value: PemakaianStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "DIAJUKAN", label: "Diajukan" },
  { value: "MENUNGGU_VALIDASI", label: "Menunggu validasi Depo" },
  { value: "TERVERIFIKASI", label: "Terverifikasi" },
  { value: "SELESAI", label: "Selesai" },
];

/** Satu baris struk: satu jenis alkes dalam order. */
type PemakaianLine = {
  lineId: string;
  barang: string;
  distributor?: string;
  qtyRencana: number;
  qtyDipakai: number;
  tipe: "BARU" | "REUSE";
  /** Dari mapping distributor / pencarian tambah barang (LOT, ukuran, ED). */
  lot?: string;
  ukuran?: string;
  ed?: string;
  /** Harga satuan referensi (IDR), dari master saat pilih barang. */
  harga?: number;
};

/** Satu order = satu pasien / satu waktu resep — berisi banyak barang (seperti kasir). */
type PemakaianOrder = {
  id: string;
  tanggal: string;
  pasien: string;
  /** Nomor RM (Supabase `no_rm`; fallback parsing dari sufiks "Nama (RM)" pada `pasien`). */
  no_rm?: string;
  /** Ruangan / lokasi tindakan. */
  ruangan: string;
  dokter: string;
  depo: string;
  status: PemakaianStatus;
  items: PemakaianLine[];
  /** Catatan ke Depo (kolom opsional di DB). */
  catatan?: string;
  /** Template tab Obat/Alkes & Komponen (kolom `template_input_barang`). */
  templateInputBarang?: TemplateInputBarangPayload;
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

const idrLineFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatHargaCell(harga: number | undefined): string {
  if (harga == null || Number.isNaN(harga)) return "—";
  return idrLineFormatter.format(harga);
}

/** Untuk input `datetime-local`: YYYY-MM-DDTHH:mm (waktu lokal). */
function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Harga dari baris pilihan; jika null, pakai baris lain dengan master_barang_id sama (master-only / varian lain). */
function hargaFromPickRow(
  v: MasterBarangPickRow,
  options: MasterBarangPickRow[],
): number | undefined {
  if (v.harga_jual != null && Number.isFinite(Number(v.harga_jual))) {
    return Number(v.harga_jual);
  }
  const mid = v.master_barang_id;
  for (const r of options) {
    if (r.master_barang_id !== mid) continue;
    if (r.harga_jual != null && Number.isFinite(Number(r.harga_jual))) {
      return Number(r.harga_jual);
    }
  }
  return undefined;
}

function narrowByLineFields(
  candidates: MasterBarangPickRow[],
  line: Pick<PemakaianLine, "distributor" | "lot" | "ukuran" | "ed">,
): MasterBarangPickRow[] {
  if (candidates.length <= 1) return candidates;
  const L = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
  let filtered = candidates;
  const lot = L(line.lot);
  const uk = L(line.ukuran);
  const ed = L(line.ed);
  const dist = L(line.distributor);
  if (lot) {
    const f = filtered.filter((v) => L(v.lot) === lot);
    if (f.length) filtered = f;
  }
  if (uk) {
    const f = filtered.filter((v) => L(v.ukuran) === uk);
    if (f.length) filtered = f;
  }
  if (ed) {
    const f = filtered.filter((v) => L(v.ed) === ed);
    if (f.length) filtered = f;
  }
  if (dist) {
    const f = filtered.filter((v) => L(v.distributor_nama) === dist);
    if (f.length) filtered = f;
  }
  return filtered.length ? filtered : candidates;
}

/** Cocokkan nama/kode/barcode; bila banyak varian sama nama, sempitkan dengan LOT/ED/ukuran/distributor pada baris. */
function resolveHargaFromBarangInput(
  label: string,
  options: MasterBarangPickRow[],
  line?: Pick<PemakaianLine, "distributor" | "lot" | "ukuran" | "ed">,
): number | undefined {
  const q = label.trim().toLowerCase();
  if (!q) return undefined;
  const byBarcode = options.find(
    (v) => (v.barcode ?? "").trim().toLowerCase() === q,
  );
  if (byBarcode) return hargaFromPickRow(byBarcode, options);
  const byKode = options.find((v) => v.kode.trim().toLowerCase() === q);
  if (byKode) return hargaFromPickRow(byKode, options);
  const sameNama = options.filter((v) => v.nama.trim().toLowerCase() === q);
  let candidates = sameNama;
  if (sameNama.length === 0) {
    candidates = options.filter((v) => v.kode.trim().toLowerCase() === q);
  }
  if (candidates.length === 0) return undefined;
  const narrowed = line ? narrowByLineFields(candidates, line) : candidates;
  for (const c of narrowed) {
    const h = hargaFromPickRow(c, options);
    if (h !== undefined) return h;
  }
  return undefined;
}

function mapCathlabOrderRow(r: Record<string, unknown>): PemakaianOrder | null {
  const id = r.id;
  if (typeof id !== "string" || !id.trim()) return null;
  const tanggal = typeof r.tanggal === "string" ? r.tanggal : "";
  const pasien = typeof r.pasien === "string" ? r.pasien : "";
  const ruangan = typeof r.ruangan === "string" ? r.ruangan.trim() : "";
  const dokter = typeof r.dokter === "string" ? r.dokter : "";
  const depo = typeof r.depo === "string" ? r.depo : "";
  const status = r.status;
  const allowed: PemakaianStatus[] = [
    "DRAFT",
    "DIAJUKAN",
    "MENUNGGU_VALIDASI",
    "TERVERIFIKASI",
    "SELESAI",
  ];
  if (
    typeof status !== "string" ||
    !allowed.includes(status as PemakaianStatus)
  )
    return null;
  const rawItems = r.items;
  const items: PemakaianLine[] = [];
  if (Array.isArray(rawItems)) {
    for (const it of rawItems) {
      if (!it || typeof it !== "object") continue;
      const o = it as Record<string, unknown>;
      const lineId = typeof o.lineId === "string" ? o.lineId : "";
      const barang = typeof o.barang === "string" ? o.barang : "";
      if (!lineId || !barang) continue;
      const hargaParsed = (() => {
        const h = o.harga;
        if (typeof h === "number" && Number.isFinite(h)) return h;
        if (typeof h === "string" && h.trim()) {
          const n = Number(h);
          return Number.isFinite(n) ? n : undefined;
        }
        return undefined;
      })();
      items.push({
        lineId,
        barang,
        distributor:
          typeof o.distributor === "string" ? o.distributor : undefined,
        qtyRencana:
          typeof o.qtyRencana === "number"
            ? o.qtyRencana
            : Number(o.qtyRencana) || 0,
        qtyDipakai:
          typeof o.qtyDipakai === "number"
            ? o.qtyDipakai
            : Number(o.qtyDipakai) || 0,
        tipe: o.tipe === "REUSE" ? "REUSE" : "BARU",
        lot: typeof o.lot === "string" ? o.lot : undefined,
        ukuran: typeof o.ukuran === "string" ? o.ukuran : undefined,
        ed: typeof o.ed === "string" ? o.ed : undefined,
        ...(hargaParsed !== undefined ? { harga: hargaParsed } : {}),
      });
    }
  }
  const catatan =
    typeof r.catatan === "string" && r.catatan.trim()
      ? r.catatan.trim()
      : undefined;

  const templateInputBarang = normalizeTemplateInputBarang(
    r.template_input_barang,
  );

  const noRmCol =
    typeof r.no_rm === "string" && r.no_rm.trim() ? r.no_rm.trim() : undefined;

  return {
    id,
    tanggal,
    pasien,
    ...(noRmCol ? { no_rm: noRmCol } : {}),
    ruangan,
    dokter,
    depo,
    status: status as PemakaianStatus,
    items,
    ...(catatan ? { catatan } : {}),
    templateInputBarang,
  };
}

const PEMAKAIAN_RM_SUFFIX_RE = /\s+\(([^)]+)\)\s*$/;

function parseRmFromPasienLabel(pasien: string): string | undefined {
  const m = pasien.trim().match(PEMAKAIAN_RM_SUFFIX_RE);
  const rm = m?.[1]?.trim();
  return rm || undefined;
}

function orderNoRm(o: Pick<PemakaianOrder, "no_rm" | "pasien">): string {
  const col = (o.no_rm ?? "").trim();
  if (col) return col;
  return parseRmFromPasienLabel(o.pasien) ?? "";
}

function orderPasienDisplayName(
  o: Pick<PemakaianOrder, "no_rm" | "pasien">,
): string {
  const rm = orderNoRm(o);
  if (!rm) return o.pasien;
  const suf = ` (${rm})`;
  const t = o.pasien.trim();
  if (t.endsWith(suf)) return t.slice(0, -suf.length).trim();
  return o.pasien;
}

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
  sampai: string,
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

function mapApiPasienRow(r: Record<string, unknown>): PasienOption | null {
  const rawId = r.id;
  if (rawId == null || rawId === "") return null;
  const id = String(rawId);
  const nama = typeof r.nama === "string" ? r.nama : String(r.nama ?? "");
  const no_rm = r.no_rm == null || r.no_rm === "" ? null : String(r.no_rm);
  const ca = r.created_at;
  const created_at =
    typeof ca === "string"
      ? ca
      : ca instanceof Date
        ? ca.toISOString()
        : ca != null
          ? String(ca)
          : null;
  return { id, nama, no_rm, created_at };
}

/** created_at (timestamptz) masuk tanggal kalender lokal hari ini. */
function isPasienCreatedLocalToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

/*───────────────────────────────────────────────
 ⚙️ PemakaianPage – Cathlab JARVIS Mode v4.0
   Resep Alkes • Pemakaian • Depo
───────────────────────────────────────────────*/
export default function PemakaianPage() {
  const searchParams = useSearchParams();
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();
  const [selectedStatus, setSelectedStatus] = useState<PemakaianStatus | "ALL">(
    "ALL",
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mode, setMode] = useState<"RESEP" | "PEMAKAIAN">("PEMAKAIAN");
  const [orders, setOrders] = useState<PemakaianOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersFetchError, setOrdersFetchError] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  /** Username sesi (dari /api/auth/me); untuk akun level dokter dipakai sebagai nama dokter default. */
  const [sessionUsername, setSessionUsername] = useState<string | null>(null);
  const [drawerPasien, setDrawerPasien] = useState("");
  const [drawerDokter, setDrawerDokter] = useState("");
  /** `yyyy-MM-dd'T'HH:mm` untuk form drawer (kalender + jam). */
  const [drawerDateTime, setDrawerDateTime] = useState("");
  const [pasienList, setPasienList] = useState<PasienOption[]>([]);
  const [pasienListLoading, setPasienListLoading] = useState(false);
  const [doctorList, setDoctorList] = useState<DoctorOption[]>([]);
  const [doctorListLoading, setDoctorListLoading] = useState(false);
  const [ruanganList, setRuanganList] = useState<RuanganOption[]>([]);
  const [ruanganListLoading, setRuanganListLoading] = useState(false);
  /** Satu kali per buka drawer: autofill pasien (hari ini) & dokter (sesi). */
  const drawerAutofillRef = useRef({ pasien: false, dokter: false });
  /** Deep link Tindakan → Pemakaian: jangan buka drawer berulang untuk query yang sama. */
  const pemakaianDeepLinkOpenedKeyRef = useRef<string | null>(null);
  /** Hasil fetch `/api/tindakan/[id]` untuk mengisi pasien setelah `pasienList` siap. */
  const tindakanDeepLinkRef = useRef<{
    tid: string;
    pasienId: string | null;
  } | null>(null);
  const openPemakaianDrawerRef = useRef<() => void>(() => {});
  const [barangVariantList, setBarangVariantList] = useState<
    MasterBarangPickRow[]
  >([]);
  const [barangVariantLoading, setBarangVariantLoading] = useState(false);
  const [barangPickerOpen, setBarangPickerOpen] = useState(false);
  /** Modal tambah barang: dari panel Edit order atau form Input Pemakaian. */
  const [barangPickerTarget, setBarangPickerTarget] = useState<
    "detail" | "drawer" | null
  >(null);
  const [barangPickerQuery, setBarangPickerQuery] = useState("");
  const [barangScanOpen, setBarangScanOpen] = useState(false);
  /** Baris rincian di drawer Input Pemakaian (sama struktur dengan edit order). */
  const [drawerLines, setDrawerLines] = useState<PemakaianLine[]>([]);
  const [drawerDepo, setDrawerDepo] = useState("");
  const [drawerRuangan, setDrawerRuangan] = useState("");
  const [drawerCatatan, setDrawerCatatan] = useState("");
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTanggalDari, setFilterTanggalDari] = useState("");
  const [filterTanggalSampai, setFilterTanggalSampai] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailRow, setDetailRow] = useState<PemakaianOrder | null>(null);
  const [detailDraft, setDetailDraft] = useState<PemakaianOrder | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);
  /** Sub-tab di blok Rincian barang: Struk | Obat/Alkes | Komponen */
  const [detailRincianTab, setDetailRincianTab] =
    useState<RincianBarangTab>("struk");
  /** Baris template checklist (localStorage, bisa diedit). */
  const [templateRowsObat, setTemplateRowsObat] = useState<
    TemplateChecklistRow[]
  >(() => [...TEMPLATE_OBAT_ALKES]);
  const [templateRowsKomponen, setTemplateRowsKomponen] = useState<
    TemplateChecklistRow[]
  >(() => [...TEMPLATE_KOMPONEN]);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);

  useEffect(() => {
    setTemplateRowsObat(loadObatAlkesRows());
    setTemplateRowsKomponen(loadKomponenRows());
  }, []);

  function openOrderDetail(row: PemakaianOrder) {
    setDetailRow(row);
    setDetailDraft(structuredClone(row));
    setDetailRincianTab("struk");
  }

  function closeOrderDetail() {
    closeBarangPicker();
    setDetailRow(null);
    setDetailDraft(null);
    setDetailRincianTab("struk");
  }

  function patchDetailTemplateField(
    key: "obatAlkes" | "komponen",
    rowId: string,
    value: string,
  ) {
    setDetailDraft((d) => {
      if (!d) return d;
      const cur = d.templateInputBarang ?? {
        obatAlkes: {},
        komponen: {},
      };
      return {
        ...d,
        templateInputBarang: {
          ...cur,
          [key]: { ...cur[key], [rowId]: value },
        },
      };
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (barangScanOpen) {
        e.preventDefault();
        setBarangScanOpen(false);
        return;
      }
      if (barangPickerOpen) {
        e.preventDefault();
        closeBarangPicker();
        return;
      }
      if (isDrawerOpen) {
        e.preventDefault();
        closePemakaianDrawer();
        return;
      }
      closeOrderDetail();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [barangScanOpen, barangPickerOpen, isDrawerOpen]);

  const loadOrders = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setOrdersLoading(true);
      setOrdersFetchError(null);
    }
    try {
      const res = await fetch("/api/pemakaian-orders", {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json()) as {
        ok?: boolean;
        orders?: unknown[];
        message?: string;
      };
      if (!res.ok || !j?.ok) {
        setOrders([]);
        setOrdersFetchError(
          typeof j?.message === "string"
            ? j.message
            : "Gagal memuat daftar order dari database.",
        );
        return;
      }
      setOrdersFetchError(null);
      const rows = Array.isArray(j.orders) ? j.orders : [];
      const mapped = rows
        .map((row) => mapCathlabOrderRow(row as Record<string, unknown>))
        .filter((x): x is PemakaianOrder => x != null);
      setOrders(mapped);
    } catch {
      setOrders([]);
      setOrdersFetchError("Tidak dapat menghubungi server.");
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  /** Sinkron daftar order dari Supabase Realtime (tanpa refresh halaman). */
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void loadOrders({ silent: true });
      }, 450);
    };

    let cancelled = false;
    let channel: unknown = null;
    let supabaseRemoveChannel: ((ch: unknown) => unknown) | null = null;

    void (async () => {
      try {
        const mod = await import("@/lib/supabase/supabaseClient");
        if (cancelled) return;
        if (!mod.isSupabaseConfigured()) return;
        const sb: any = mod.supabase as any;
        supabaseRemoveChannel = (ch: unknown) => sb.removeChannel(ch as any);
        channel = sb
          .channel("realtime:pemakaian-orders")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "cathlab_pemakaian_order" },
            () => scheduleRefresh(),
          )
          .subscribe();
      } catch {
        /* ignore realtime */
      }
    })();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      try {
        if (channel && supabaseRemoveChannel) {
          void supabaseRemoveChannel(channel);
        }
      } catch {
        /* ignore */
      }
    };
  }, [loadOrders]);

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

  /** Master ruangan — dimuat langsung saat buka halaman agar autofill Edit order / drawer siap (sama pola prioritas dengan dokter). */
  useEffect(() => {
    let alive = true;
    setRuanganListLoading(true);
    void fetch("/api/ruangan", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ok?: boolean; ruangan?: RuanganOption[] }) => {
        if (!alive) return;
        if (j?.ok && Array.isArray(j.ruangan)) setRuanganList(j.ruangan);
        else setRuanganList([]);
      })
      .catch(() => {
        if (alive) setRuanganList([]);
      })
      .finally(() => {
        if (alive) setRuanganListLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const isDokterSession = role === ROLE_DOKTER;

  const qpPasien = searchParams.get("pasienId") || searchParams.get("rm");
  const qpTindakanId = searchParams.get("tindakanId");
  const hasPemakaianDeepLink =
    Boolean(qpPasien) || Boolean(qpTindakanId?.trim());
  const shouldLoadDoctors =
    isDrawerOpen || detailRow != null || hasPemakaianDeepLink;

  /** Master dokter + pasien + katalog variant barang (drawer & panel Edit order). */
  useEffect(() => {
    if (!shouldLoadDoctors) return;
    let alive = true;
    setDoctorListLoading(true);
    setPasienListLoading(true);
    setBarangVariantLoading(true);
    void Promise.all([
      fetch("/api/doctors", { credentials: "include", cache: "no-store" }),
      fetch("/api/pasien", { credentials: "include", cache: "no-store" }),
      fetch("/api/master-barang/variants", {
        credentials: "include",
        cache: "no-store",
      }),
    ])
      .then(async ([dr, ps, vr]) => {
        const [dj, pj, vj] = await Promise.all([
          dr.json(),
          ps.json(),
          vr.json(),
        ]);
        if (!alive) return;
        if (dj?.ok && Array.isArray(dj.doctors)) setDoctorList(dj.doctors);
        else setDoctorList([]);
        if (pj?.ok && Array.isArray(pj.data)) {
          const rows = (pj.data as Record<string, unknown>[])
            .map(mapApiPasienRow)
            .filter((x): x is PasienOption => x != null);
          setPasienList(rows);
        } else setPasienList([]);
        if (vj?.ok && Array.isArray(vj.items)) setBarangVariantList(vj.items);
        else setBarangVariantList([]);
      })
      .catch(() => {
        if (alive) {
          setDoctorList([]);
          setPasienList([]);
          setBarangVariantList([]);
        }
      })
      .finally(() => {
        if (alive) {
          setDoctorListLoading(false);
          setPasienListLoading(false);
          setBarangVariantLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [shouldLoadDoctors]);

  /** Akun level dokter: cocokkan username login ke master dokter (DB) — sekali per buka drawer; tidak menimpa isian user. */
  useEffect(() => {
    if (!isDrawerOpen) return;
    if (drawerAutofillRef.current.dokter) return;
    if (doctorListLoading) return;
    drawerAutofillRef.current.dokter = true;
    if (!isDokterSession || !sessionUsername) return;
    const exact = doctorList.find(
      (d) =>
        d.nama_dokter.trim().toLowerCase() ===
        sessionUsername.trim().toLowerCase(),
    );
    if (!exact) return;
    setDrawerDokter((prev) => (prev.trim() ? prev : formatDoctorLabel(exact)));
  }, [
    isDrawerOpen,
    isDokterSession,
    sessionUsername,
    doctorList,
    doctorListLoading,
  ]);

  /** Pasien terbaru hari ini — hanya jika kolom pasien masih kosong (tidak menimpa ketikan). */
  useEffect(() => {
    if (!isDrawerOpen) return;
    const skipTodayForDeepLink =
      Boolean(searchParams.get("pasienId")?.trim()) ||
      Boolean(searchParams.get("rm")?.trim()) ||
      Boolean(searchParams.get("tindakanId")?.trim());
    if (skipTodayForDeepLink) {
      drawerAutofillRef.current.pasien = true;
      return;
    }
    if (drawerAutofillRef.current.pasien) return;
    if (pasienListLoading) return;
    drawerAutofillRef.current.pasien = true;
    const todayRows = pasienList
      .filter((p) => isPasienCreatedLocalToday(p.created_at))
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
    if (todayRows.length > 0) {
      setDrawerPasien((prev) =>
        prev.trim() ? prev : formatPasienLabel(todayRows[0]),
      );
    }
  }, [isDrawerOpen, pasienList, pasienListLoading, searchParams]);

  /** Deep link dari modul Tindakan (`?pasienId=` / `?rm=` / `?tindakanId=`). */
  useEffect(() => {
    if (!isDrawerOpen) return;
    if (pasienListLoading) return;
    const rm = searchParams.get("rm");
    const pid = searchParams.get("pasienId");
    if (!rm && !pid) return;
    const p = pid
      ? pasienList.find((x) => x.id === pid)
      : pasienList.find((x) => (x.no_rm ?? "").trim() === (rm ?? "").trim());
    if (p) setDrawerPasien(formatPasienLabel(p));
  }, [isDrawerOpen, pasienList, pasienListLoading, searchParams]);

  function newDrawerLineId() {
    return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function patchDrawerLine(lineId: string, patch: Partial<PemakaianLine>) {
    setDrawerLines((rows) =>
      rows.map((l) => {
        if (l.lineId !== lineId) return l;
        const next = { ...l, ...patch };
        if (!next.barang.trim()) return { ...next, harga: undefined };
        if (patch.harga !== undefined) return next;
        const h = resolveHargaFromBarangInput(
          next.barang,
          barangVariantList,
          next,
        );
        if (h !== undefined) return { ...next, harga: h };
        return next;
      }),
    );
  }

  function removeDrawerLine(lineId: string) {
    setDrawerLines((rows) => {
      const next = rows.filter((l) => l.lineId !== lineId);
      return next.length > 0
        ? next
        : [
            {
              lineId: newDrawerLineId(),
              barang: "",
              distributor: "",
              qtyRencana: 1,
              qtyDipakai: 0,
              tipe: "BARU",
            },
          ];
    });
  }

  const DEFAULT_DRAWER_DEPO = "Depo Cathlab / Depo Farmasi";

  function openPemakaianDrawer() {
    closeOrderDetail();
    drawerAutofillRef.current = { pasien: false, dokter: false };
    setDrawerPasien("");
    setDrawerDokter("");
    setDrawerDepo(DEFAULT_DRAWER_DEPO);
    setDrawerRuangan("");
    setDrawerCatatan("");
    setDrawerDateTime(toDatetimeLocalValue(new Date()));
    setDrawerLines([
      {
        lineId: newDrawerLineId(),
        barang: "",
        distributor: "",
        qtyRencana: 1,
        qtyDipakai: 0,
        tipe: "BARU",
      },
    ]);
    setIsDrawerOpen(true);
  }

  openPemakaianDrawerRef.current = openPemakaianDrawer;

  /** Buka drawer Input Pemakaian otomatis bila URL berisi deep link dari modul Tindakan. */
  useEffect(() => {
    const pid = searchParams.get("pasienId")?.trim();
    const rm = searchParams.get("rm")?.trim();
    const tid = searchParams.get("tindakanId")?.trim();
    if (!pid && !rm && !tid) {
      pemakaianDeepLinkOpenedKeyRef.current = null;
      return;
    }
    if (isDrawerOpen) return;
    const key = `${pid ?? ""}|${rm ?? ""}|${tid ?? ""}`;
    if (pemakaianDeepLinkOpenedKeyRef.current === key) return;
    pemakaianDeepLinkOpenedKeyRef.current = key;
    openPemakaianDrawerRef.current();
  }, [searchParams, isDrawerOpen]);

  /** Ambil konteks kasus (dokter, ruangan, catatan) dari `tindakanId`; isi pasien setelah master pasien siap. */
  useEffect(() => {
    const tid = searchParams.get("tindakanId")?.trim();
    if (!tid || !isDrawerOpen) {
      if (!tid) tindakanDeepLinkRef.current = null;
      return;
    }

    const applyPasienFromRef = () => {
      const cur = tindakanDeepLinkRef.current;
      const pid = cur?.pasienId;
      if (!pid || !cur || cur.tid !== tid) return;
      if (pasienList.length === 0) return;
      const p = pasienList.find((x) => x.id === pid);
      if (p) {
        setDrawerPasien((prev) => (prev.trim() ? prev : formatPasienLabel(p)));
      }
    };

    if (tindakanDeepLinkRef.current?.tid === tid) {
      applyPasienFromRef();
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/tindakan/${encodeURIComponent(tid)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const j = (await res.json()) as {
          ok?: boolean;
          data?: {
            dokter?: string | null;
            ruangan?: string | null;
            tindakan?: string | null;
            tanggal?: string | null;
            pasien_id?: string | null;
          };
        };
        if (cancelled || !j?.ok || !j.data) return;
        if (tid !== searchParams.get("tindakanId")?.trim()) return;
        const d = j.data;
        tindakanDeepLinkRef.current = {
          tid,
          pasienId:
            typeof d.pasien_id === "string" && d.pasien_id.trim()
              ? d.pasien_id.trim()
              : null,
        };
        setDrawerDokter((prev) =>
          prev.trim() ? prev : String(d.dokter ?? "").trim(),
        );
        setDrawerRuangan((prev) =>
          prev.trim() ? prev : String(d.ruangan ?? "").trim(),
        );
        const hint =
          d.tindakan && d.tanggal
            ? `Kasus tindakan: ${d.tindakan} (${d.tanggal}).`
            : d.tindakan
              ? `Kasus tindakan: ${d.tindakan}.`
              : "";
        if (hint) {
          setDrawerCatatan((prev) => (prev.trim() ? prev : hint));
        }
        applyPasienFromRef();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDrawerOpen, searchParams, pasienList]);

  const canVerifyDepo = useMemo(
    () => (role != null ? DEPO_VERIFY_ROLES.has(role) : false),
    [role],
  );

  async function verifyRow(orderId: string) {
    try {
      const res = await fetch(
        `/api/pemakaian-orders/${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "TERVERIFIKASI" }),
        },
      );
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        order?: Record<string, unknown>;
      };
      if (!res.ok || !j?.ok) {
        void appAlert({
          variant: "error",
          message:
            typeof j?.message === "string"
              ? j.message
              : `Gagal verifikasi (HTTP ${res.status}).`,
        });
        return;
      }
      const mapped = j.order
        ? mapCathlabOrderRow(j.order as Record<string, unknown>)
        : null;
      if (mapped) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? mapped : o)));
        setDetailRow((d) => (d?.id === orderId ? mapped : d));
        setDetailDraft((d) =>
          d?.id === orderId ? structuredClone(mapped) : d,
        );
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId && o.status === "MENUNGGU_VALIDASI"
              ? { ...o, status: "TERVERIFIKASI" as const }
              : o,
          ),
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
      }
      void loadOrders({ silent: true });
    } catch (e) {
      void appAlert({
        variant: "error",
        message:
          e instanceof Error
            ? e.message
            : "Gagal verifikasi (jaringan atau server).",
      });
    }
  }

  async function deleteOrder(orderId: string, pasienLabel: string) {
    const ok = await appConfirm({
      title: "Hapus order?",
      message:
        `Hapus order ${orderId} — ${pasienLabel}?\n\n` +
        "Data akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Hapus permanen",
      cancelLabel: "Batal",
      danger: true,
    });
    if (!ok) return;
    setDeletingOrderId(orderId);
    try {
      const res = await fetch(
        `/api/pemakaian-orders/${encodeURIComponent(orderId)}`,
        { method: "DELETE", credentials: "include", cache: "no-store" },
      );
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !j?.ok) {
        const err =
          typeof j?.message === "string"
            ? j.message
            : `Gagal menghapus (HTTP ${res.status}).`;
        void appAlert({ variant: "error", message: err });
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (detailRow?.id === orderId) closeOrderDetail();
    } catch (e) {
      void appAlert({
        variant: "error",
        message:
          e instanceof Error
            ? e.message
            : "Gagal menghapus (jaringan atau server tidak merespons).",
      });
    } finally {
      setDeletingOrderId(null);
    }
  }

  function cancelDetailEdit() {
    if (!detailRow) return;
    const fresh = orders.find((o) => o.id === detailRow.id);
    setDetailDraft(structuredClone(fresh ?? detailRow));
  }

  async function saveDetailDraft() {
    if (!detailDraft || detailSaving) return;
    setDetailSaving(true);
    try {
      const res = await fetch(
        `/api/pemakaian-orders/${encodeURIComponent(detailDraft.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tanggal: detailDraft.tanggal,
            pasien: detailDraft.pasien,
            no_rm:
              parseRmFromPasienLabel(detailDraft.pasien)?.trim() ||
              detailDraft.no_rm?.trim() ||
              null,
            ruangan: detailDraft.ruangan,
            dokter: detailDraft.dokter,
            depo: detailDraft.depo,
            status: detailDraft.status,
            items: detailDraft.items,
            catatan: detailDraft.catatan ?? null,
            templateInputBarang: detailDraft.templateInputBarang ?? {
              obatAlkes: {},
              komponen: {},
            },
          }),
        },
      );
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        order?: Record<string, unknown>;
      };
      if (!res.ok || !j?.ok) {
        void appAlert({
          variant: "error",
          message:
            typeof j?.message === "string"
              ? j.message
              : `Gagal menyimpan (HTTP ${res.status}).`,
        });
        return;
      }
      const mapped = j.order
        ? mapCathlabOrderRow(j.order as Record<string, unknown>)
        : null;
      if (mapped) {
        setOrders((prev) => prev.map((o) => (o.id === mapped.id ? mapped : o)));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === detailDraft.id ? detailDraft : o)),
        );
      }
      void loadOrders({ silent: true });
      closeOrderDetail();
    } catch (e) {
      void appAlert({
        variant: "error",
        message:
          e instanceof Error
            ? e.message
            : "Gagal menyimpan (jaringan atau server).",
      });
    } finally {
      setDetailSaving(false);
    }
  }

  function closeBarangPicker() {
    setBarangPickerOpen(false);
    setBarangPickerQuery("");
    setBarangPickerTarget(null);
    setBarangScanOpen(false);
  }

  function closePemakaianDrawer() {
    closeBarangPicker();
    setDrawerSaving(false);
    setIsDrawerOpen(false);
  }

  /** Hilangkan karakter tak terlihat yang kadang membuat .trim() tetap “kosong” di UI. */
  function cleanFormText(s: string): string {
    return s
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u00A0/g, " ")
      .trim();
  }

  async function submitDrawerPemakaian() {
    if (drawerSaving) return;
    const pasien = cleanFormText(drawerPasien);
    const dokter = cleanFormText(drawerDokter);
    let depo = cleanFormText(drawerDepo);
    if (!depo) depo = DEFAULT_DRAWER_DEPO;

    const missing: string[] = [];
    if (!pasien) missing.push("Pasien");
    if (!dokter) missing.push("Dokter / Operator");
    if (!depo) missing.push("Depo");
    if (missing.length > 0) {
      void appAlert({
        variant: "warning",
        title: "Data belum lengkap",
        message:
          `Mohon isi: ${missing.join(", ")}.\n\n` +
          "Tips: teks yang terlihat di kolom harus Anda ketik atau pilih dari daftar (bukan hanya placeholder abu-abu).",
      });
      return;
    }

    const hasBarang = drawerLines.some(
      (l) => cleanFormText(l.barang).length > 0,
    );
    if (!hasBarang) {
      void appAlert({
        variant: "warning",
        message:
          "Tambah minimal satu baris dengan nama barang terisi di kolom Barang.",
      });
      return;
    }

    const nBarang = drawerLines.filter(
      (l) => cleanFormText(l.barang).length > 0,
    ).length;
    const ruangan = cleanFormText(drawerRuangan);
    const konfirmasi =
      `Kirim order ke Depo Farmasi?\n\n` +
      `• Pasien: ${pasien}\n` +
      (ruangan ? `• Ruangan: ${ruangan}\n` : "") +
      `• Dokter: ${dokter}\n` +
      `• Depo: ${depo}\n` +
      `• ${nBarang} jenis barang\n\n` +
      `Status akan diset “menunggu validasi Depo”.`;
    const okSubmit = await appConfirm({
      title: "Kirim ke Depo Farmasi?",
      message: konfirmasi,
      confirmLabel: "Simpan & kirim",
      cancelLabel: "Batal",
    });
    if (!okSubmit) return;

    setDrawerSaving(true);
    try {
      const res = await fetch("/api/pemakaian-orders", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          tanggal: drawerDateTime,
          pasien,
          no_rm: parseRmFromPasienLabel(pasien)?.trim() || null,
          ruangan,
          dokter,
          depo,
          items: drawerLines.filter((l) => cleanFormText(l.barang).length > 0),
          catatan: drawerCatatan.trim() || undefined,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        order?: { id?: string };
      };
      if (!res.ok || !j?.ok) {
        void appAlert({
          variant: "error",
          message:
            typeof j?.message === "string"
              ? j.message
              : `Gagal menyimpan (HTTP ${res.status}).`,
        });
        return;
      }
      const oid = typeof j.order?.id === "string" ? j.order.id : "";
      await loadOrders();
      closePemakaianDrawer();
      void appAlert({
        variant: "success",
        title: "Order tersimpan",
        message: oid
          ? `Order ${oid} dikirim ke Depo Farmasi (status: menunggu validasi).`
          : "Order dikirim ke Depo Farmasi (menunggu validasi).",
      });
    } catch (e) {
      void appAlert({
        variant: "error",
        message:
          e instanceof Error
            ? e.message
            : "Gagal menyimpan (jaringan atau server).",
      });
    } finally {
      setDrawerSaving(false);
    }
  }

  function addEmptyLineFromPicker() {
    const suffix = Date.now().toString(36);
    if (barangPickerTarget === "detail" && detailDraft) {
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
    } else if (barangPickerTarget === "drawer") {
      setDrawerLines((rows) => [
        ...rows,
        {
          lineId: `draft-new-${suffix}`,
          barang: "",
          distributor: "",
          qtyRencana: 1,
          qtyDipakai: 0,
          tipe: "BARU",
        },
      ]);
    }
    closeBarangPicker();
  }

  function applyBarangPick(pick: MasterBarangPickRow) {
    const suffix = Date.now().toString(36);
    const hPick = hargaFromPickRow(pick, barangVariantList);
    const line: PemakaianLine = {
      lineId: "",
      barang: pick.nama.trim(),
      distributor: pick.distributor_nama?.trim() || undefined,
      qtyRencana: 1,
      qtyDipakai: 0,
      tipe: "BARU",
      lot: pick.lot?.trim() || undefined,
      ukuran: pick.ukuran?.trim() || undefined,
      ed: pick.ed?.trim() || undefined,
      ...(hPick !== undefined ? { harga: hPick } : {}),
    };
    if (barangPickerTarget === "detail" && detailDraft) {
      line.lineId = `${detailDraft.id}-new-${suffix}`;
      setDetailDraft({
        ...detailDraft,
        items: [...detailDraft.items, line],
      });
    } else if (barangPickerTarget === "drawer") {
      line.lineId = `draft-new-${suffix}`;
      setDrawerLines((rows) => [...rows, line]);
    }
    closeBarangPicker();
  }

  /** Kamera / hasil pindai: cocokkan barcode persis, lalu filter; auto-tambah jika satu baris. */
  function handleBarangScanDecoded(text: string) {
    const raw = text.trim();
    if (!raw) return;
    setBarangScanOpen(false);
    const q = raw.toLowerCase();
    const byBarcode = barangVariantList.find(
      (v) => v.barcode?.trim().toLowerCase() === q,
    );
    if (byBarcode) {
      applyBarangPick(byBarcode);
      return;
    }
    const matches = barangVariantList.filter((v) =>
      pickRowSearchHaystack(v).includes(q),
    );
    if (matches.length === 1) {
      applyBarangPick(matches[0]);
      return;
    }
    setBarangPickerQuery(raw);
  }

  const filteredBarangPicks = useMemo(() => {
    const q = barangPickerQuery.trim().toLowerCase();
    if (!q) return barangVariantList;
    return barangVariantList.filter((v) =>
      pickRowSearchHaystack(v).includes(q),
    );
  }, [barangPickerQuery, barangVariantList]);

  function patchDetailLine(lineId: string, patch: Partial<PemakaianLine>) {
    setDetailDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        items: d.items.map((l) => {
          if (l.lineId !== lineId) return l;
          const next = { ...l, ...patch };
          if (!next.barang.trim()) return { ...next, harga: undefined };
          if (patch.harga !== undefined) return next;
          const h = resolveHargaFromBarangInput(
            next.barang,
            barangVariantList,
            next,
          );
          if (h !== undefined) return { ...next, harga: h };
          return next;
        }),
      };
    });
  }

  function removeDetailLine(lineId: string) {
    setDetailDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        items: d.items.filter((l) => l.lineId !== lineId),
      };
    });
  }

  /** Setelah katalog master termuat / buka edit order: isi kolom harga yang masih kosong dari master. */
  useEffect(() => {
    if (barangVariantList.length === 0) return;
    setDetailDraft((d) => {
      if (!d) return d;
      let changed = false;
      const items = d.items.map((line) => {
        if (line.harga != null && Number.isFinite(line.harga)) return line;
        if (!line.barang.trim()) return line;
        const h = resolveHargaFromBarangInput(
          line.barang,
          barangVariantList,
          line,
        );
        if (h === undefined) return line;
        changed = true;
        return { ...line, harga: h };
      });
      return changed ? { ...d, items } : d;
    });
  }, [barangVariantList, detailDraft?.id]);

  useEffect(() => {
    if (barangVariantList.length === 0) return;
    setDrawerLines((rows) => {
      let changed = false;
      const next = rows.map((line) => {
        if (line.harga != null && Number.isFinite(line.harga)) return line;
        if (!line.barang.trim()) return line;
        const h = resolveHargaFromBarangInput(
          line.barang,
          barangVariantList,
          line,
        );
        if (h === undefined) return line;
        changed = true;
        return { ...line, harga: h };
      });
      return changed ? next : rows;
    });
  }, [barangVariantList, isDrawerOpen]);

  const trimmedSearch = searchQuery.trim().toLowerCase();

  const filteredData = useMemo(() => {
    let list = orders;
    if (selectedStatus !== "ALL") {
      list = list.filter((o) => o.status === selectedStatus);
    }
    if (filterTanggalDari || filterTanggalSampai) {
      list = list.filter((o) =>
        orderTanggalInRange(o.tanggal, filterTanggalDari, filterTanggalSampai),
      );
    }
    if (!trimmedSearch) return list;
    return list.filter((o) => {
      const statusText = STATUS_SEARCH_TEXT[o.status];
      const lineHay = o.items
        .map((l) =>
          `${l.barang} ${l.distributor ?? ""} ${l.tipe} ${l.lineId} ${l.lot ?? ""} ${l.ukuran ?? ""} ${l.ed ?? ""} ${l.harga != null ? String(l.harga) : ""}`.toLowerCase(),
        )
        .join(" ");
      const hay = [
        o.id,
        o.tanggal,
        o.pasien,
        orderNoRm(o),
        o.ruangan,
        o.dokter,
        o.depo,
        statusText,
        lineHay,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(trimmedSearch);
    });
  }, [
    orders,
    selectedStatus,
    trimmedSearch,
    filterTanggalDari,
    filterTanggalSampai,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredData.length / pageSize) || 1);
  const safePage = Math.min(page, pageCount);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [
    selectedStatus,
    trimmedSearch,
    filterTanggalDari,
    filterTanggalSampai,
    pageSize,
  ]);

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
      acc +
      o.items
        .filter((l) => l.tipe === "BARU")
        .reduce((a, l) => a + l.qtyDipakai, 0),
    0,
  );
  const totalReuse = orders.reduce(
    (acc, o) =>
      acc +
      o.items
        .filter((l) => l.tipe === "REUSE")
        .reduce((a, l) => a + l.qtyDipakai, 0),
    0,
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
        <div className="flex flex-wrap items-center gap-3 mb-2 justify-between animate-in fade-in slide-in-from-top-2 duration-300">
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
                suppressHydrationWarning
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
                suppressHydrationWarning
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
          </div>
        </div>

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
                  <p
                    className={`text-2xl font-bold tabular-nums ${c.valueClass}`}
                  >
                    {c.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter & pencarian ── */}
        <div className="bg-[#050b14]/95 border border-white/10 rounded-2xl px-4 py-3 flex flex-col gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
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
        </div>

        {/* ── Tabel Pemakaian / Resep ── */}
        <div className="min-w-0 max-w-full bg-[#050b14]/95 border border-white/10 rounded-2xl p-4 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
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
                {ordersFetchError ? (
                  <p className="text-[10px] text-amber-200/90 mt-2 rounded-lg border border-amber-500/30 bg-amber-950/40 px-2 py-1.5">
                    {ordersFetchError} Pastikan migrasi{" "}
                    <code className="text-[9px]">cathlab_pemakaian_order</code>{" "}
                    sudah di-push dan{" "}
                    <code className="text-[9px]">
                      SUPABASE_SERVICE_ROLE_KEY
                    </code>{" "}
                    terset di server.
                  </p>
                ) : null}
              </div>
              <button
                suppressHydrationWarning
                type="button"
                onClick={openPemakaianDrawer}
                className="inline-flex shrink-0 items-center gap-2 self-start px-3.5 py-1.5 rounded-full
                         bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#2dd4bf]
                         text-xs font-semibold text-[#0a0f18] shadow-[0_0_20px_rgba(232,197,71,0.45)]
                         hover:shadow-[0_0_26px_rgba(45,212,191,0.35)] transition"
              >
                <PlusCircle size={16} strokeWidth={2.25} />
                {mode === "RESEP" ? "Buat Resep Alkes" : "Input Pemakaian"}
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0">
                <Filter
                  size={14}
                  className="text-white/55 shrink-0"
                  aria-hidden
                />
                <span className="font-semibold text-white text-[11px]">
                  Status
                </span>
                <select
                  suppressHydrationWarning
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value as PemakaianStatus | "ALL")
                  }
                  className="bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:ring-2 focus:ring-[#E8C547]/50 min-w-[8.5rem]"
                >
                  <option value="ALL">Semua Status</option>
                  {PEMAKAIAN_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
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
                    suppressHydrationWarning
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
                  suppressHydrationWarning
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]
                           bg-black/40 border border-white/20 text-white/95
                           hover:bg-white/5 hover:border-[#E8C547]/40 transition"
                >
                  <PrintIcon size={14} className="text-[#E8C547]" />
                  Cetak
                </button>
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto overflow-y-visible text-xs rounded-xl border border-white/[0.08] [scrollbar-gutter:stable]">
            <table className="min-w-full divide-y divide-white/[0.06]">
              <thead className="bg-[#0a1628]">
                <tr>
                  <Th>ID</Th>
                  <Th>Tanggal</Th>
                  <Th>RM</Th>
                  <Th>Pasien</Th>
                  <Th>Ruangan</Th>
                  <Th>Dokter</Th>
                  <Th>Depo</Th>
                  <Th>Status</Th>
                  <Th className="text-center w-[1%] whitespace-nowrap">Aksi</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] bg-[#000814]/80">
                {ordersLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-white/50 text-[11px]"
                    >
                      Memuat daftar order dari database…
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-white/45 text-[11px]"
                    >
                      {orders.length === 0
                        ? "Belum ada order. Data diambil dari tabel cathlab_pemakaian_order (setelah migrasi)."
                        : "Belum ada data untuk filter/pencarian ini."}
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
                      <Td className="tabular-nums whitespace-nowrap">
                        {orderNoRm(row) ? (
                          <span className="text-white/90">{orderNoRm(row)}</span>
                        ) : (
                          <span className="text-white/35">—</span>
                        )}
                      </Td>
                      <Td>{orderPasienDisplayName(row)}</Td>
                      <Td className="max-w-[140px]">
                        {row.ruangan ? (
                          <span className="text-white/90">{row.ruangan}</span>
                        ) : (
                          <span className="text-white/35">—</span>
                        )}
                      </Td>
                      <Td>{row.dokter}</Td>
                      <Td>{row.depo}</Td>
                      <Td className="align-middle">
                        <div className="flex flex-wrap items-center gap-2 min-w-[140px]">
                          <StatusBadge status={row.status} />
                          {canVerifyDepo &&
                            row.status === "MENUNGGU_VALIDASI" && (
                              <button
                                suppressHydrationWarning
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void verifyRow(row.id);
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
                      <Td className="align-middle text-center">
                        <button
                          suppressHydrationWarning
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteOrder(
                              row.id,
                              orderPasienDisplayName(row) || row.pasien,
                            );
                          }}
                          disabled={deletingOrderId === row.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/50 bg-rose-950/60 px-2 py-1 text-[10px] font-semibold text-rose-200 hover:bg-rose-900/70 hover:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/50 disabled:opacity-50 disabled:pointer-events-none"
                          aria-label={`Hapus order ${row.id}`}
                        >
                          <Trash2 className="h-3 w-3 shrink-0" aria-hidden />
                          Hapus
                        </button>
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
                  suppressHydrationWarning
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
                  suppressHydrationWarning
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
                  suppressHydrationWarning
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
        </div>

        {/* ── Panel detail baris (klik tabel) ── */}
        {detailRow && detailDraft && (
          <div
            className="fixed inset-0 z-[45] flex items-stretch justify-end print:hidden"
            role="presentation"
          >
            <button
              suppressHydrationWarning
              type="button"
              className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
              aria-label="Tutup detail"
              onClick={closeOrderDetail}
            />
            <div
              className={[
                "relative z-10 flex h-full min-h-0 min-w-0 w-full max-w-full flex-col bg-[#050b14] shadow-2xl",
                /* Mobile: panel lebar penuh, sudut atas membulat seperti lembar */
                "max-sm:max-h-[100dvh] max-sm:border-x max-sm:border-t max-sm:border-white/15 max-sm:rounded-t-2xl",
                /* Desktop: drawer kanan, lebih lebar untuk tabel rincian */
                "sm:max-h-none sm:max-w-2xl sm:border-l sm:border-t-0 sm:border-r-0 sm:border-b-0 sm:border-white/15 sm:rounded-none",
                "animate-in fade-in slide-in-from-right-6 duration-200",
              ].join(" ")}
              role="dialog"
              aria-modal="true"
              aria-labelledby="pemakaian-detail-title"
            >
              <div
                className="flex shrink-0 items-start justify-between gap-2 border-b border-white/10 px-3 py-3 sm:px-4"
                style={{
                  paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
                }}
              >
                <div className="min-w-0 pr-2">
                  <h3
                    id="pemakaian-detail-title"
                    className="text-sm font-semibold text-[#E8C547] sm:text-base"
                  >
                    Edit order
                  </h3>
                  <p className="text-[10px] text-white/45 mt-1 sm:hidden">
                    Layar penuh · geser tabel ke samping bila perlu
                  </p>
                  <p className="text-[11px] text-white/50 mt-0.5 font-mono truncate">
                    {detailRow.id}
                  </p>
                </div>
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={closeOrderDetail}
                  className="shrink-0 rounded-lg p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white sm:p-1.5 sm:min-h-0 sm:min-w-0"
                  aria-label="Tutup"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-y-contain px-3 py-3 space-y-3 text-[11px] sm:px-4 sm:py-3 touch-pan-y">
                <label className="block space-y-1">
                  <span className="text-white/55">Tanggal</span>
                  <input
                    type="text"
                    value={detailDraft.tanggal}
                    onChange={(e) =>
                      setDetailDraft((d) =>
                        d ? { ...d, tanggal: e.target.value } : d,
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
                        d ? { ...d, pasien: e.target.value } : d,
                      )
                    }
                    className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                  />
                </label>
                <div className="block space-y-1">
                  <span className="text-white/55">Ruangan</span>
                  <RuanganCombobox
                    listboxId="pemakaian-edit-order-ruangan"
                    value={detailDraft.ruangan}
                    onChange={(label) =>
                      setDetailDraft((d) => (d ? { ...d, ruangan: label } : d))
                    }
                    options={ruanganList}
                    loading={ruanganListLoading}
                  />
                  <p className="text-[10px] text-white/40 pt-0.5">
                    Pilih dari master Ruangan (DB) atau ketik manual.
                  </p>
                </div>
                <div className="block space-y-1">
                  <span className="text-white/55">Dokter</span>
                  <DoctorCombobox
                    listboxId="pemakaian-edit-order-doctor"
                    value={detailDraft.dokter}
                    onChange={(label) =>
                      setDetailDraft((d) => (d ? { ...d, dokter: label } : d))
                    }
                    options={doctorList}
                    loading={doctorListLoading}
                  />
                  <p className="text-[10px] text-white/40 pt-0.5">
                    Pilih dari master Dokter (DB) atau ketik untuk mencari.
                  </p>
                </div>
                <label className="block space-y-1">
                  <span className="text-white/55">Depo</span>
                  <input
                    type="text"
                    value={detailDraft.depo}
                    onChange={(e) =>
                      setDetailDraft((d) =>
                        d ? { ...d, depo: e.target.value } : d,
                      )
                    }
                    className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                  />
                </label>
                <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                  <DetailField
                    label="Total qty resep"
                    value={String(sumQtyRencana(detailDraft))}
                  />
                  <DetailField
                    label="Total qty dipakai"
                    value={String(sumQtyDipakai(detailDraft))}
                  />
                </div>
                <div className="min-w-0 max-w-full">
                  <div className="text-[#E8C547] font-semibold mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span>Rincian barang (struk)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/45 font-normal text-[10px]">
                        {detailDraft.items.length} jenis
                      </span>
                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() => setTemplateEditorOpen(true)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-semibold text-white/90 hover:border-cyan-400/45 hover:bg-cyan-950/40 hover:text-cyan-100"
                        title="Edit daftar baris Obat/Alkes & Komponen (simpan di peramban)"
                      >
                        <Pencil
                          className="h-3 w-3 text-cyan-300/90"
                          aria-hidden
                        />
                        Edit template
                      </button>
                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-semibold text-white/90 hover:border-[#E8C547]/45 hover:bg-[#E8C547]/10 hover:text-[#E8C547]"
                        title="Cetak — termasuk lembar CONSUMABLE ANGIOGRAFI (halaman 2)"
                      >
                        <PrintIcon size={12} className="text-[#E8C547]" />
                        Cetak
                      </button>
                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() => {
                          setBarangPickerTarget("detail");
                          setBarangPickerOpen(true);
                          setBarangPickerQuery("");
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-[#E8C547]/50 bg-[#E8C547]/10 px-2.5 py-1 text-[10px] font-semibold text-[#E8C547] hover:bg-[#E8C547]/20"
                      >
                        <PlusCircle className="h-3 w-3" aria-hidden />
                        Tambah
                      </button>
                    </div>
                  </div>
                  <RincianBarangTemplateTabs
                    tab={detailRincianTab}
                    onTabChange={setDetailRincianTab}
                    rowsObatAlkes={templateRowsObat}
                    rowsKomponen={templateRowsKomponen}
                    obatAlkes={detailDraft.templateInputBarang?.obatAlkes ?? {}}
                    komponen={detailDraft.templateInputBarang?.komponen ?? {}}
                    onChangeObatAlkes={(id, v) =>
                      patchDetailTemplateField("obatAlkes", id, v)
                    }
                    onChangeKomponen={(id, v) =>
                      patchDetailTemplateField("komponen", id, v)
                    }
                  >
                    <div className="min-w-0 max-w-full rounded-xl border border-white/10 overflow-x-auto [scrollbar-gutter:stable]">
                      <table className="w-max min-w-[800px] text-[10px]">
                        <thead>
                          <tr className="bg-[#0a1628] text-white/80">
                            <th className="text-left font-semibold px-2 py-1.5 min-w-[100px]">
                              Barang
                            </th>
                            <th className="text-left font-semibold px-2 py-1.5 min-w-[88px]">
                              Distributor
                            </th>
                            <th className="text-left font-semibold px-2 py-1.5 min-w-[64px]">
                              Ukuran
                            </th>
                            <th className="text-left font-semibold px-2 py-1.5 min-w-[56px]">
                              LOT
                            </th>
                            <th className="text-left font-semibold px-2 py-1.5 min-w-[52px]">
                              ED
                            </th>
                            <th className="text-right font-semibold px-2 py-1.5 whitespace-nowrap min-w-[6.5rem]">
                              Harga
                            </th>
                            <th className="text-center font-semibold px-2 py-1.5 whitespace-nowrap min-w-[4.25rem]">
                              Resep
                            </th>
                            <th className="text-center font-semibold px-2 py-1.5 whitespace-nowrap min-w-[3.5rem]">
                              Stok
                            </th>
                            <th className="text-center font-semibold px-1 py-1.5 w-[72px]">
                              Tipe
                            </th>
                            <th className="text-center font-semibold px-1 py-1.5 w-[1%] whitespace-nowrap">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                          {detailDraft.items.map((line) => (
                            <tr key={line.lineId} className="bg-black/20">
                              <td className="px-1.5 py-1 align-top">
                                <BarangVariantCombobox
                                  variant="table"
                                  listboxId={`pemakaian-barang-${line.lineId}`}
                                  value={line.barang}
                                  onChange={(nama) =>
                                    patchDetailLine(line.lineId, {
                                      barang: nama,
                                    })
                                  }
                                  onPickVariant={(v) => {
                                    const h = hargaFromPickRow(
                                      v,
                                      barangVariantList,
                                    );
                                    patchDetailLine(line.lineId, {
                                      barang: v.nama.trim(),
                                      distributor:
                                        v.distributor_nama?.trim() || undefined,
                                      lot: v.lot?.trim() || undefined,
                                      ukuran: v.ukuran?.trim() || undefined,
                                      ed: v.ed?.trim() || undefined,
                                      ...(h !== undefined ? { harga: h } : {}),
                                    });
                                  }}
                                  options={barangVariantList}
                                  loading={barangVariantLoading}
                                />
                              </td>
                              <td className="px-1.5 py-1 align-top">
                                <input
                                  type="text"
                                  value={line.distributor ?? ""}
                                  onChange={(e) =>
                                    patchDetailLine(line.lineId, {
                                      distributor: e.target.value || undefined,
                                    })
                                  }
                                  className="w-full min-w-[76px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white/80 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                                />
                              </td>
                              <td className="px-1.5 py-1 align-top">
                                <input
                                  type="text"
                                  value={line.ukuran ?? ""}
                                  onChange={(e) =>
                                    patchDetailLine(line.lineId, {
                                      ukuran:
                                        e.target.value.trim() || undefined,
                                    })
                                  }
                                  placeholder="—"
                                  className="w-full min-w-[56px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white/85 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                                />
                              </td>
                              <td className="px-1.5 py-1 align-top">
                                <input
                                  type="text"
                                  value={line.lot ?? ""}
                                  onChange={(e) =>
                                    patchDetailLine(line.lineId, {
                                      lot: e.target.value.trim() || undefined,
                                    })
                                  }
                                  placeholder="—"
                                  className="w-full min-w-[52px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white/85 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                                />
                              </td>
                              <td className="px-1.5 py-1 align-top">
                                <input
                                  type="text"
                                  value={line.ed ?? ""}
                                  onChange={(e) =>
                                    patchDetailLine(line.lineId, {
                                      ed: e.target.value.trim() || undefined,
                                    })
                                  }
                                  placeholder="MM-YYYY"
                                  className="w-full min-w-[52px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white/85 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                                />
                              </td>
                              <td className="px-1.5 py-1.5 align-middle text-right tabular-nums text-white/90 text-[10px]">
                                {formatHargaCell(line.harga)}
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
                                        Number(e.target.value) || 0,
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
                                        Number(e.target.value) || 0,
                                      ),
                                    })
                                  }
                                  className="w-full bg-black/50 border border-white/15 rounded px-1 py-1 text-center tabular-nums text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                                />
                              </td>
                              <td className="px-1 py-1 align-top">
                                <select
                                  suppressHydrationWarning
                                  value={line.tipe}
                                  onChange={(e) =>
                                    patchDetailLine(line.lineId, {
                                      tipe: e.target
                                        .value as PemakaianLine["tipe"],
                                    })
                                  }
                                  className="w-full bg-black/50 border border-white/15 rounded px-0.5 py-1 text-[9px] text-white focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                                >
                                  <option value="BARU">BARU</option>
                                  <option value="REUSE">REUSE</option>
                                </select>
                              </td>
                              <td className="px-1 py-1 align-middle text-center">
                                <button
                                  suppressHydrationWarning
                                  type="button"
                                  onClick={() => removeDetailLine(line.lineId)}
                                  className="inline-flex items-center gap-0.5 rounded-lg border border-rose-500/50 bg-rose-950/50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-200 hover:bg-rose-900/60 focus:outline-none focus:ring-1 focus:ring-rose-400/50"
                                  aria-label={`Hapus baris ${line.barang || line.lineId}`}
                                  title="Hapus baris"
                                >
                                  <Trash2
                                    className="h-3 w-3 shrink-0"
                                    aria-hidden
                                  />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </RincianBarangTemplateTabs>
                </div>
                <div>
                  <div className="text-white/55 mb-1">Status order</div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <select
                      suppressHydrationWarning
                      value={detailDraft.status}
                      onChange={(e) =>
                        setDetailDraft((d) =>
                          d
                            ? {
                                ...d,
                                status: e.target.value as PemakaianStatus,
                              }
                            : d,
                        )
                      }
                      className="w-full sm:w-auto sm:min-w-[14rem] bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:ring-2 focus:ring-[#E8C547]/50"
                      aria-label="Pilih status order"
                    >
                      {PEMAKAIAN_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={detailDraft.status} />
                      {canVerifyDepo &&
                        detailDraft.status === "MENUNGGU_VALIDASI" && (
                          <button
                            suppressHydrationWarning
                            type="button"
                            onClick={() => void verifyRow(detailDraft.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/70 bg-emerald-950/80 px-2.5 py-1 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-900/90"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            Verifikasi di Depo
                          </button>
                        )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-white/40 pt-2 border-t border-white/10">
                  Ubah data lalu Simpan — form ini tertutup dan daftar
                  diperbarui. Satu order dapat berisi banyak baris alkes;
                  verifikasi Depo memproses seluruh order sekaligus.
                </p>
              </div>
              <div
                className="border-t border-white/10 px-3 py-3 sm:px-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end shrink-0"
                style={{
                  paddingBottom:
                    "max(0.75rem, env(safe-area-inset-bottom, 0px))",
                }}
              >
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={cancelDetailEdit}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-full text-[11px] border border-white/20 text-white/85 hover:bg-white/5 flex items-center justify-center"
                >
                  Batal
                </button>
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={() => void saveDetailDraft()}
                  disabled={detailSaving}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:px-4 sm:py-1.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#2dd4bf] text-[#0a0f18] shadow-[0_0_14px_rgba(232,197,71,0.35)] hover:shadow-[0_0_18px_rgba(45,212,191,0.25)] flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                >
                  {detailSaving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Drawer / Panel Form (skeleton, belum tersambung backend) ── */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:p-4">
            <button
              suppressHydrationWarning
              type="button"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm border-0 cursor-default p-0"
              aria-label="Tutup form"
              onClick={closePemakaianDrawer}
            />
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full sm:max-w-2xl max-h-[90vh] bg-[#050b14] border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-200"
            >
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#E8C547]">
                    {mode === "RESEP"
                      ? "Buat Resep / Order Alkes"
                      : "Input Pemakaian Alkes"}
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Data pasien &amp; dokter dari database. Simpan mengirim ke
                    Depo Farmasi (menunggu validasi).
                  </p>
                </div>
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={closePemakaianDrawer}
                  className="text-xs text-white/60 hover:text-white"
                >
                  Tutup
                </button>
              </div>

              <div className="px-4 py-3 space-y-3 overflow-y-auto text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <LabeledField label="Pasien">
                    <PasienCombobox
                      listboxId="pemakaian-drawer-pasien"
                      value={drawerPasien}
                      onChange={setDrawerPasien}
                      options={pasienList}
                      loading={pasienListLoading}
                    />
                    <p className="text-[10px] text-white/45 mt-0.5">
                      Daftar dari database (Supabase). Jika ada pasien terdaftar
                      hari ini, nama terbaru diisi otomatis.
                    </p>
                  </LabeledField>
                  <LabeledField label="Dokter / Operator">
                    <DoctorCombobox
                      listboxId="pemakaian-drawer-doctor"
                      value={drawerDokter}
                      onChange={setDrawerDokter}
                      options={doctorList}
                      loading={doctorListLoading}
                    />
                    <p className="text-[10px] text-white/45 mt-0.5">
                      {isDokterSession
                        ? "Master dokter dari database; jika username login sama dengan nama dokter, diisi otomatis."
                        : "Pilih dari master Dokter (database) atau ketik untuk mencari."}
                    </p>
                  </LabeledField>
                  <LabeledField label="Ruangan">
                    <RuanganCombobox
                      listboxId="pemakaian-drawer-ruangan"
                      value={drawerRuangan}
                      onChange={setDrawerRuangan}
                      options={ruanganList}
                      loading={ruanganListLoading}
                    />
                    <p className="text-[10px] text-white/45 mt-0.5">
                      Master <span className="text-[#E8C547]/85">Ruangan</span>{" "}
                      di dashboard; bisa juga diketik bebas.
                    </p>
                  </LabeledField>
                  <LabeledField label="Depo">
                    <input
                      value={drawerDepo}
                      onChange={(e) => setDrawerDepo(e.target.value)}
                      placeholder="Depo Cathlab / Depo Farmasi"
                      className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40"
                    />
                  </LabeledField>
                  <div className="sm:col-span-2">
                    <LabeledField label="Tanggal & Jam">
                      <DatetimeLocalPicker
                        value={drawerDateTime}
                        onChange={setDrawerDateTime}
                      />
                    </LabeledField>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="text-[#E8C547] font-semibold mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs">Detail Barang Alkes</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/45 font-normal text-[10px]">
                        {drawerLines.length} jenis
                      </span>
                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-semibold text-white/90 hover:border-[#E8C547]/45 hover:bg-[#E8C547]/10 hover:text-[#E8C547]"
                        title="Cetak daftar order (filter saat ini)"
                      >
                        <PrintIcon size={12} className="text-[#E8C547]" />
                        Cetak
                      </button>
                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() => {
                          setBarangPickerTarget("drawer");
                          setBarangPickerOpen(true);
                          setBarangPickerQuery("");
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-[#E8C547]/50 bg-[#E8C547]/10 px-2.5 py-1 text-[10px] font-semibold text-[#E8C547] hover:bg-[#E8C547]/20"
                      >
                        <PlusCircle className="h-3 w-3" aria-hidden />
                        Tambah
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2 text-[10px] text-white/65">
                    <span>
                      Total qty resep:{" "}
                      <span className="text-white/90 tabular-nums font-medium">
                        {drawerLines.reduce((a, l) => a + l.qtyRencana, 0)}
                      </span>
                    </span>
                    <span>
                      Total qty dipakai:{" "}
                      <span className="text-white/90 tabular-nums font-medium">
                        {drawerLines.reduce((a, l) => a + l.qtyDipakai, 0)}
                      </span>
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/10 overflow-x-auto">
                    <table className="w-full text-[10px] min-w-[800px]">
                      <thead>
                        <tr className="bg-[#0a1628] text-white/80">
                          <th className="text-left font-semibold px-2 py-1.5 min-w-[100px]">
                            Barang
                          </th>
                          <th className="text-left font-semibold px-2 py-1.5 min-w-[88px]">
                            Distributor
                          </th>
                          <th className="text-left font-semibold px-2 py-1.5 min-w-[64px]">
                            Ukuran
                          </th>
                          <th className="text-left font-semibold px-2 py-1.5 min-w-[56px]">
                            LOT
                          </th>
                          <th className="text-left font-semibold px-2 py-1.5 min-w-[52px]">
                            ED
                          </th>
                          <th className="text-right font-semibold px-2 py-1.5 whitespace-nowrap min-w-[6.5rem]">
                            Harga
                          </th>
                          <th className="text-center font-semibold px-2 py-1.5 whitespace-nowrap min-w-[4.25rem]">
                            Resep
                          </th>
                          <th className="text-center font-semibold px-2 py-1.5 whitespace-nowrap min-w-[3.5rem]">
                            Stok
                          </th>
                          <th className="text-center font-semibold px-1 py-1.5 w-[72px]">
                            Tipe
                          </th>
                          <th className="text-center font-semibold px-1 py-1.5 w-[1%] whitespace-nowrap">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {drawerLines.map((line) => (
                          <tr key={line.lineId} className="bg-black/20">
                            <td className="px-1.5 py-1 align-top">
                              <BarangVariantCombobox
                                variant="table"
                                listboxId={`pemakaian-drawer-barang-${line.lineId}`}
                                value={line.barang}
                                onChange={(nama) =>
                                  patchDrawerLine(line.lineId, { barang: nama })
                                }
                                onPickVariant={(v) => {
                                  const h = hargaFromPickRow(
                                    v,
                                    barangVariantList,
                                  );
                                  patchDrawerLine(line.lineId, {
                                    barang: v.nama.trim(),
                                    distributor:
                                      v.distributor_nama?.trim() || undefined,
                                    lot: v.lot?.trim() || undefined,
                                    ukuran: v.ukuran?.trim() || undefined,
                                    ed: v.ed?.trim() || undefined,
                                    ...(h !== undefined ? { harga: h } : {}),
                                  });
                                }}
                                options={barangVariantList}
                                loading={barangVariantLoading}
                              />
                            </td>
                            <td className="px-1.5 py-1 align-top">
                              <input
                                type="text"
                                value={line.distributor ?? ""}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    distributor: e.target.value || undefined,
                                  })
                                }
                                className="w-full min-w-[76px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white/80 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              />
                            </td>
                            <td className="px-1.5 py-1 align-top">
                              <input
                                type="text"
                                value={line.ukuran ?? ""}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    ukuran: e.target.value.trim() || undefined,
                                  })
                                }
                                placeholder="—"
                                className="w-full min-w-[56px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white/85 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              />
                            </td>
                            <td className="px-1.5 py-1 align-top">
                              <input
                                type="text"
                                value={line.lot ?? ""}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    lot: e.target.value.trim() || undefined,
                                  })
                                }
                                placeholder="—"
                                className="w-full min-w-[52px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white/85 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              />
                            </td>
                            <td className="px-1.5 py-1 align-top">
                              <input
                                type="text"
                                value={line.ed ?? ""}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    ed: e.target.value.trim() || undefined,
                                  })
                                }
                                placeholder="MM-YYYY"
                                className="w-full min-w-[52px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white/85 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              />
                            </td>
                            <td className="px-1.5 py-1.5 align-middle text-right tabular-nums text-white/90 text-[10px]">
                              {formatHargaCell(line.harga)}
                            </td>
                            <td className="px-1 py-1 align-top">
                              <input
                                type="number"
                                min={0}
                                value={line.qtyRencana}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    qtyRencana: Math.max(
                                      0,
                                      Number(e.target.value) || 0,
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
                                  patchDrawerLine(line.lineId, {
                                    qtyDipakai: Math.max(
                                      0,
                                      Number(e.target.value) || 0,
                                    ),
                                  })
                                }
                                className="w-full bg-black/50 border border-white/15 rounded px-1 py-1 text-center tabular-nums text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              />
                            </td>
                            <td className="px-1 py-1 align-top">
                              <select
                                suppressHydrationWarning
                                value={line.tipe}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    tipe: e.target
                                      .value as PemakaianLine["tipe"],
                                  })
                                }
                                className="w-full bg-black/50 border border-white/15 rounded px-0.5 py-1 text-[9px] text-white focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              >
                                <option value="BARU">BARU</option>
                                <option value="REUSE">REUSE</option>
                              </select>
                            </td>
                            <td className="px-1 py-1 align-middle text-center">
                              <button
                                suppressHydrationWarning
                                type="button"
                                onClick={() => removeDrawerLine(line.lineId)}
                                className="inline-flex items-center gap-0.5 rounded-lg border border-rose-500/50 bg-rose-950/50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-200 hover:bg-rose-900/60 focus:outline-none focus:ring-1 focus:ring-rose-400/50"
                                aria-label={`Hapus baris ${line.barang || line.lineId}`}
                                title="Hapus baris"
                              >
                                <Trash2
                                  className="h-3 w-3 shrink-0"
                                  aria-hidden
                                />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <LabeledField label="Catatan (opsional)">
                    <textarea
                      rows={2}
                      value={drawerCatatan}
                      onChange={(e) => setDrawerCatatan(e.target.value)}
                      placeholder="Catatan klinis / instruksi ke Depo..."
                      className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40"
                    />
                  </LabeledField>
                  <div className="flex flex-col gap-2 text-[11px] text-white/60">
                    <span className="font-semibold text-[#E8C547]">
                      Ringkasan Singkat
                    </span>
                    <span>
                      - Mode:{" "}
                      {mode === "RESEP" ? "Resep / Order" : "Pemakaian Final"}
                    </span>
                    <span>
                      - Setelah tersimpan, Depo Farmasi dapat memverifikasi &
                      koreksi stok.
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-white/10 flex flex-wrap gap-2 justify-end">
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={closePemakaianDrawer}
                  disabled={drawerSaving}
                  className="px-3 py-1.5 rounded-full text-xs border border-white/20 text-white/85 hover:bg-white/5 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={() => void submitDrawerPemakaian()}
                  disabled={drawerSaving}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold
                           bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#2dd4bf]
                           text-[#0a0f18] shadow-[0_0_18px_rgba(232,197,71,0.35)] hover:shadow-[0_0_22px_rgba(45,212,191,0.25)] disabled:opacity-60 disabled:pointer-events-none"
                >
                  {drawerSaving ? "Menyimpan…" : "Simpan & Kirim ke Depo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {barangPickerOpen ? (
          <div
            className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-3 bg-black/75 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pemakaian-barang-picker-title"
            onClick={closeBarangPicker}
          >
            <div
              className="w-full max-w-lg max-h-[min(420px,70vh)] flex flex-col rounded-2xl border border-white/15 bg-[#0a1628] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
                <h4
                  id="pemakaian-barang-picker-title"
                  className="text-[11px] font-semibold text-[#E8C547]"
                >
                  Cari &amp; tambah barang
                </h4>
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={closeBarangPicker}
                  className="rounded-lg p-1 text-white/55 hover:bg-white/10 hover:text-white"
                  aria-label="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-3 py-2 border-b border-white/10 shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40 pointer-events-none" />
                  <input
                    type="search"
                    value={barangPickerQuery}
                    onChange={(e) => setBarangPickerQuery(e.target.value)}
                    placeholder="Nama, kode, barcode, LOT, ukuran, ED, distributor…"
                    className="w-full rounded-lg border border-white/15 bg-black/40 py-2 pl-8 pr-11 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                    autoFocus
                  />
                  <button
                    suppressHydrationWarning
                    type="button"
                    onClick={() => setBarangScanOpen(true)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-teal-300/90 hover:bg-white/10 hover:text-[#E8C547] focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                    aria-label="Pindai barcode atau QR dengan kamera"
                    title="Pindai barcode / QR"
                  >
                    <ScanLine className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <p className="text-[9px] text-white/45 mt-1.5">
                  Data dari master barang + variant distributor (LOT / ukuran /
                  ED). Kosongkan kotak untuk menampilkan semua. Scanner USB
                  mengisi kotak ini seperti keyboard; ikon kamera untuk pindai
                  lewat perangkat.
                </p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {barangVariantLoading ? (
                  <p className="px-3 py-6 text-center text-[11px] text-white/50">
                    Memuat katalog…
                  </p>
                ) : filteredBarangPicks.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[11px] text-white/50">
                    {barangVariantList.length === 0
                      ? "Belum ada data master / mapping distributor."
                      : "Tidak ada baris yang cocok dengan pencarian."}
                  </p>
                ) : (
                  <ul className="py-1">
                    {filteredBarangPicks.map((v) => (
                      <li key={v.pickId}>
                        <button
                          suppressHydrationWarning
                          type="button"
                          onClick={() => applyBarangPick(v)}
                          className="w-full text-left px-3 py-2 hover:bg-[#E8C547]/15 focus:bg-[#E8C547]/20 focus:outline-none border-b border-white/[0.06] last:border-0"
                        >
                          <span className="block text-[11px] font-medium text-white/95">
                            {v.nama}
                          </span>
                          <span className="block text-[9px] text-white/50 mt-0.5 space-x-1">
                            {[v.kode && `Kode: ${v.kode}`, v.jenis]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                          {(v.lot ||
                            v.ukuran ||
                            v.ed ||
                            v.distributor_nama) && (
                            <span className="block text-[9px] text-teal-200/90 mt-0.5">
                              {[
                                v.lot && `LOT ${v.lot}`,
                                v.ukuran && `Uk. ${v.ukuran}`,
                                v.ed && `ED ${v.ed}`,
                                v.distributor_nama && v.distributor_nama,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="px-3 py-2 border-t border-white/10 flex flex-wrap gap-2 justify-between items-center shrink-0">
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={addEmptyLineFromPicker}
                  className="text-[10px] text-white/55 hover:text-[#E8C547] underline underline-offset-2"
                >
                  Baris kosong (isi manual)
                </button>
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={closeBarangPicker}
                  className="px-2.5 py-1 rounded-lg text-[10px] border border-white/20 text-white/85 hover:bg-white/5"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <ScanBarcodeQRDialog
          open={barangScanOpen}
          onClose={() => setBarangScanOpen(false)}
          onDecoded={handleBarangScanDecoded}
        />

        <TemplateBarangEditorDialog
          open={templateEditorOpen}
          onClose={() => setTemplateEditorOpen(false)}
          initialObatAlkes={templateRowsObat}
          initialKomponen={templateRowsKomponen}
          onSaved={(obat, komponen) => {
            setTemplateRowsObat(obat);
            setTemplateRowsKomponen(komponen);
            const idO = new Set(obat.map((r) => r.id));
            const idK = new Set(komponen.map((r) => r.id));
            setDetailDraft((d) => {
              if (!d?.templateInputBarang) return d;
              const cur = d.templateInputBarang;
              const obatAlkes: Record<string, string> = {};
              for (const [k, v] of Object.entries(cur.obatAlkes ?? {})) {
                if (idO.has(k)) obatAlkes[k] = v;
              }
              const komponenM: Record<string, string> = {};
              for (const [k, v] of Object.entries(cur.komponen ?? {})) {
                if (idK.has(k)) komponenM[k] = v;
              }
              return {
                ...d,
                templateInputBarang: { obatAlkes, komponen: komponenM },
              };
            });
          }}
        />
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
        {/* Form CONSUMABLE ANGIOGRAFI (halaman 2) saat panel Edit order terbuka — selaras Google Doc judul sama */}
        {detailDraft ? (
          <div
            className="print:break-before-page print:pt-6"
            style={{ pageBreakBefore: "always" }}
          >
            <ConsumableAngiografiPrintTemplate
              mode={mode}
              order={{
                id: detailDraft.id,
                tanggal: detailDraft.tanggal,
                no_rm: orderNoRm(detailDraft),
                pasien: orderPasienDisplayName(detailDraft),
                ruangan: detailDraft.ruangan,
                dokter: detailDraft.dokter,
                depo: detailDraft.depo,
                status:
                  PEMAKAIAN_STATUS_OPTIONS.find(
                    (x) => x.value === detailDraft.status,
                  )?.label ?? detailDraft.status,
                catatan: detailDraft.catatan,
                items: detailDraft.items.map((l) => ({
                  barang: l.barang,
                  distributor: l.distributor,
                  lot: l.lot,
                  ukuran: l.ukuran,
                  ed: l.ed,
                  harga: l.harga,
                  qtyRencana: l.qtyRencana,
                  qtyDipakai: l.qtyDipakai,
                  tipe: l.tipe,
                })),
                templateInputBarang: detailDraft.templateInputBarang ?? {
                  obatAlkes: {},
                  komponen: {},
                },
                templateRowsObatAlkes: templateRowsObat,
                templateRowsKomponen: templateRowsKomponen,
              }}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

const STATUS_SEARCH_TEXT: Record<PemakaianStatus, string> = {
  DRAFT: "draft",
  DIAJUKAN: "diajukan",
  MENUNGGU_VALIDASI: "menunggu validasi depo",
  TERVERIFIKASI: "terverifikasi",
  SELESAI: "selesai",
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
              RM
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Pasien
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Ruangan
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
                colSpan={8}
                className="border border-gray-400 px-2 py-2 text-center text-gray-600"
              >
                Tidak ada data
              </td>
            </tr>
          ) : (
            orders.map((o) => (
              <tr key={o.id}>
                <td className="border border-gray-400 px-1.5 py-0.5">{o.id}</td>
                <td className="border border-gray-400 px-1.5 py-0.5">
                  {o.tanggal}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5 tabular-nums">
                  {orderNoRm(o) || "—"}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5">
                  {orderPasienDisplayName(o)}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5">
                  {o.ruangan || "—"}
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
  SELESAI: "Selesai",
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
  const map: Record<PemakaianStatus, { label: string; className: string }> = {
    DRAFT: {
      label: "Draft",
      className: "bg-white/[0.06] text-white/80 border border-white/20",
    },
    DIAJUKAN: {
      label: "Diajukan",
      className: "bg-sky-950/80 text-sky-200 border border-sky-500/50",
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
    SELESAI: {
      label: "Selesai",
      className:
        "bg-violet-950/85 text-violet-200 border border-violet-400/50 shadow-[0_0_12px_rgba(167,139,250,0.12)]",
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

"use client";

import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Mail, MessageCircle, Search } from "lucide-react";

import { runDeduped } from "@/lib/api/runDeduped";
import { DateYmdPicker } from "@/components/ui/date-ymd-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PemakaianRow = {
  id: string;
  tanggal: string;
  jumlah: number;
  keterangan: string | null;
  inventaris: {
    nama: string;
    satuan: string | null;
    kategori?: string | null;
  } | null;
  distributor_nama?: string | null;
  created_at?: string | null;
  order_id?: string | null;
  pasien?: string | null;
  dokter?: string | null;
  ruangan?: string | null;
  no_rm?: string | null;
  status_order?: string | null;
  catatan?: string | null;
  tanggal_order_raw?: string | null;
  lot?: string | null;
  ukuran?: string | null;
  ed?: string | null;
};

type PemakaianAdminAllMode = "raw" | "distributor-only";
type ShareChannel = "wa" | "email";

type SharePreviewState = {
  channel: ShareChannel;
  subject: string;
  body: string;
  infoLink: string;
};
type IndexedPemakaianRow = {
  row: PemakaianRow;
  searchText: string;
  groupKey: string;
};

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const PORTAL_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  process.env.NEXT_PUBLIC_VERCEL_URL?.trim();

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function weekAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function formatTanggalId(tanggal: string) {
  if (!tanggal) return "—";
  const d = new Date(`${tanggal}T12:00:00`);
  if (Number.isNaN(d.getTime())) return tanggal;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function tryParseDisplayDate(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  const normalized = t.includes("T") ? t : t.replace(/\s+/, "T");
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
}

function formatReceiptDate(row: PemakaianRow): string {
  const raw = row.tanggal_order_raw?.trim();
  if (raw) {
    const d = tryParseDisplayDate(raw);
    if (d) return format(d, "EEEE, dd-MM-yyyy HH:mm:ss", { locale: idLocale });
  }
  const ca = row.created_at?.trim();
  if (ca) {
    try {
      const d = parseISO(ca);
      if (!Number.isNaN(d.getTime())) {
        return format(d, "EEEE, dd-MM-yyyy HH:mm:ss", { locale: idLocale });
      }
    } catch {
      /* ignore */
    }
  }
  if (row.tanggal) {
    const d = new Date(`${row.tanggal}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return format(d, "EEEE, dd-MM-yyyy", { locale: idLocale });
    }
  }
  return "—";
}

type KeteranganParts = {
  pasien?: string;
  dokter?: string;
  status?: string;
  cat?: string;
  order?: string;
};

function parseKeteranganParts(k: string | null | undefined): KeteranganParts {
  const out: KeteranganParts = {};
  if (!k?.trim()) return out;
  for (const seg of k.split(" · ")) {
    const s = seg.trim();
    const i = s.indexOf(":");
    if (i <= 0) continue;
    const key = s.slice(0, i).trim().toLowerCase();
    const val = s.slice(i + 1).trim();
    if (key.startsWith("pasien")) out.pasien = val;
    else if (key.startsWith("dokter")) out.dokter = val;
    else if (key.startsWith("status")) out.status = val;
    else if (key.startsWith("cat")) out.cat = val;
    else if (key.startsWith("order")) out.order = val;
  }
  return out;
}

/** Sufiks "(919830)" pada label pasien dari order / keterangan. */
function extractRmFromPasienLabel(
  pasienLabel: string | null | undefined,
): string | null {
  if (!pasienLabel?.trim()) return null;
  const m = pasienLabel.trim().match(/\(([0-9A-Za-z.,\-\s]+)\)\s*$/);
  return m ? m[1].trim() : null;
}

function pasienNamaTanpaRm(pasienLabel: string | null | undefined): string {
  if (!pasienLabel?.trim()) return "";
  return pasienLabel.replace(/\s*\([^)]+\)\s*$/, "").trim();
}

function rowKParts(row: PemakaianRow): KeteranganParts {
  return parseKeteranganParts(row.keterangan);
}

function tableNamaPasien(row: PemakaianRow): string {
  const parts = rowKParts(row);
  const label = row.pasien?.trim() || parts.pasien?.trim();
  if (!label) return "—";
  const stripped = pasienNamaTanpaRm(label);
  return stripped || label;
}

function tableNoRm(row: PemakaianRow): string {
  const parts = rowKParts(row);
  const label = row.pasien?.trim() || parts.pasien?.trim();
  const fromCol = row.no_rm?.trim();
  if (fromCol) return fromCol;
  const extracted = extractRmFromPasienLabel(label);
  return extracted ?? "—";
}

function tableDokter(row: PemakaianRow): string {
  const parts = rowKParts(row);
  const d = row.dokter?.trim() || parts.dokter?.trim();
  return d || "—";
}

function tableRuangan(row: PemakaianRow): string {
  return row.ruangan?.trim() || "—";
}

/** Label baris pemakaian: "NAMA [KATEGORI]" bila kategori tersedia. */
function barangDenganKategori(row: PemakaianRow): string {
  const nama = row.inventaris?.nama?.trim() || "—";
  const kat = row.inventaris?.kategori?.trim();
  if (!kat) return nama;
  return `${nama} [${kat}]`;
}

/** Kunci penggabungan: tanggal + pasien (RM & nama) + PT — beda PT tetap baris terpisah. */
function mergeGroupKey(row: PemakaianRow): string {
  const tgl = String(row.tanggal ?? "").trim();
  const rm = tableNoRm(row).trim();
  const nama = tableNamaPasien(row).toLowerCase().replace(/\s+/g, " ").trim();
  const pt = (row.distributor_nama ?? "").trim().toLowerCase();
  return `${tgl}\u001f${rm}\u001f${nama}\u001f${pt}`;
}

function groupPemakaianRows(list: PemakaianRow[]): PemakaianRow[][] {
  const map = new Map<string, PemakaianRow[]>();
  for (const r of list) {
    const k = mergeGroupKey(r);
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  const groups = [...map.values()].map((g) =>
    [...g].sort((a, b) => a.id.localeCompare(b.id)),
  );
  groups.sort((a, b) => {
    const ta = String(a[0]?.tanggal ?? "");
    const tb = String(b[0]?.tanggal ?? "");
    const c = tb.localeCompare(ta);
    if (c !== 0) return c;
    return mergeGroupKey(a[0]!).localeCompare(mergeGroupKey(b[0]!));
  });
  return groups;
}

function groupPemakaianIndexedRows(
  list: IndexedPemakaianRow[],
): PemakaianRow[][] {
  const map = new Map<string, PemakaianRow[]>();
  for (const item of list) {
    const arr = map.get(item.groupKey);
    if (arr) arr.push(item.row);
    else map.set(item.groupKey, [item.row]);
  }
  const groups = [...map.values()].map((g) =>
    [...g].sort((a, b) => a.id.localeCompare(b.id)),
  );
  groups.sort((a, b) => {
    const ta = String(a[0]?.tanggal ?? "");
    const tb = String(b[0]?.tanggal ?? "");
    const c = tb.localeCompare(ta);
    if (c !== 0) return c;
    return mergeGroupKey(a[0]!).localeCompare(mergeGroupKey(b[0]!));
  });
  return groups;
}

function tableDokterGroup(rows: PemakaianRow[]): string {
  const set = new Set<string>();
  for (const r of rows) {
    const d = tableDokter(r);
    if (d && d !== "—") set.add(d);
  }
  if (set.size === 0) return "—";
  if (set.size === 1) return [...set][0]!;
  return [...set].join(" · ");
}

function tableRuanganGroup(rows: PemakaianRow[]): string {
  const set = new Set<string>();
  for (const r of rows) {
    const v = tableRuangan(r);
    if (v && v !== "—") set.add(v);
  }
  if (set.size === 0) return "—";
  if (set.size === 1) return [...set][0]!;
  return [...set].join(" · ");
}

function formatReceiptDateGroup(rows: PemakaianRow[]): string {
  if (!rows.length) return "—";
  const sorted = [...rows].sort((a, b) => {
    const ra = a.tanggal_order_raw?.trim() || a.created_at || "";
    const rb = b.tanggal_order_raw?.trim() || b.created_at || "";
    return rb.localeCompare(ra);
  });
  return formatReceiptDate(sorted[0]!);
}

function displayOrderIdsGroup(
  rows: PemakaianRow[],
  /** Pemisah antar order; pakai ASCII untuk teks share (WA/Email). */
  sep = " · ",
): string {
  const ids = new Set<string>();
  for (const r of rows) {
    const p = rowKParts(r);
    const oid = displayOrderId(r, p);
    if (oid) ids.add(oid);
  }
  return [...ids].join(sep) || "-";
}

function detailDokterLine(rows: PemakaianRow[]): string | null {
  const set = new Set<string>();
  for (const r of rows) {
    const p = rowKParts(r);
    const d = r.dokter?.trim() || p.dokter?.trim();
    if (d) set.add(d);
  }
  if (set.size === 0) return null;
  return [...set].join(" · ");
}

function appendInfoAndSuggestion(lines: string[], infoLink?: string): void {
  if (infoLink?.trim()) {
    lines.push("");
    lines.push("Informasi portal:");
    lines.push(infoLink.trim());
  }
}

function resolvePublicPortalBase(): string {
  const raw = PORTAL_PUBLIC_BASE_URL ?? "";
  const normalized = raw.startsWith("http") ? raw : raw ? `https://${raw}` : "";
  if (normalized) return normalized.replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/+$/, "");
    const host = window.location.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return "";
    }
    return origin;
  }
  return "";
}

function buildShareBodyGroup(rows: PemakaianRow[], infoLink?: string): string {
  if (!rows.length) return "";
  if (rows.length === 1) {
    const r = rows[0]!;
    return buildShareBody(r, rowKParts(r), infoLink);
  }
  const head = rows[0]!;
  const headParts = rowKParts(head);
  const pasienLine = formatPasienDetailLine(head, headParts);
  const dokters = detailDokterLine(rows);
  const ruangan = tableRuanganGroup(rows);
  const lines: string[] = [];
  lines.push(`Tanggal: ${formatReceiptDateGroup(rows)}`);
  lines.push(`ID Order: ${displayOrderIdsGroup(rows, " | ")}`);
  if (pasienLine) lines.push(`Pasien: ${pasienLine}`);
  if (ruangan && ruangan !== "—") lines.push(`Ruangan: ${ruangan}`);
  if (dokters) lines.push(`Dokter: ${dokters.replace(/\s*·\s*/g, " | ")}`);
  const pt = head.distributor_nama?.trim();
  if (pt) lines.push(`PT / Distributor: ${pt}`);
  lines.push("");
  lines.push("Pemakaian:");
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const nama = barangDenganKategori(r);
    const bullet = `- ${nama}${r.jumlah != null && Number(r.jumlah) !== 1 ? ` (x${r.jumlah})` : ""}`;
    lines.push(bullet);
    const lot = r.lot?.trim();
    const ukuran = r.ukuran?.trim();
    const ed = r.ed?.trim();
    const satuan = r.inventaris?.satuan?.trim();
    if (lot) lines.push(`   LOT: ${lot}`);
    if (ukuran) lines.push(`   Ukuran: ${ukuran}`);
    if (ed) lines.push(`   ED: ${ed}`);
    if (satuan) lines.push(`   Satuan: ${satuan}`);
    if (i < rows.length - 1) lines.push("");
  }
  lines.push("");
  lines.push("- IDIK-App / Portal Distributor");
  appendInfoAndSuggestion(lines, infoLink);
  return lines.join("\n");
}

/** Satu baris untuk dialog & share: "NAMA (RM)" bila RM diketahui. */
function formatPasienDetailLine(
  row: PemakaianRow,
  parts: KeteranganParts,
): string | null {
  const label = row.pasien?.trim() || parts.pasien?.trim();
  const rm = row.no_rm?.trim() || extractRmFromPasienLabel(label) || undefined;
  const nama = label ? pasienNamaTanpaRm(label) || label : "";
  if (!label && !rm) return null;
  if (rm) {
    const n = nama || label || "—";
    return `${n} (${rm})`;
  }
  return label ?? null;
}

function displayOrderId(row: PemakaianRow, parts: KeteranganParts): string {
  return (
    row.order_id?.trim() ||
    parts.order?.trim() ||
    row.id.split("__")[0]?.trim() ||
    row.id
  );
}

function buildShareBody(
  row: PemakaianRow,
  parts: KeteranganParts,
  infoLink?: string,
): string {
  const pasienLine = formatPasienDetailLine(row, parts);
  const dokterFinal = row.dokter?.trim() || parts.dokter;
  const ruanganFinal = row.ruangan?.trim();
  const lines: string[] = [];
  lines.push(`Tanggal: ${formatReceiptDate(row)}`);
  lines.push(`ID Order: ${displayOrderId(row, parts)}`);
  if (pasienLine) lines.push(`Pasien: ${pasienLine}`);
  if (ruanganFinal && ruanganFinal !== "—")
    lines.push(`Ruangan: ${ruanganFinal}`);
  if (dokterFinal) lines.push(`Dokter: ${dokterFinal}`);
  const pt = row.distributor_nama?.trim();
  if (pt) lines.push(`PT / Distributor: ${pt}`);
  lines.push("");
  lines.push("Pemakaian:");
  const nama = barangDenganKategori(row);
  const bullet = `- ${nama}${row.jumlah != null && Number(row.jumlah) !== 1 ? ` (x${row.jumlah})` : ""}`;
  lines.push(bullet);
  const lot = row.lot?.trim();
  const ukuran = row.ukuran?.trim();
  const ed = row.ed?.trim();
  const satuan = row.inventaris?.satuan?.trim();
  if (lot) lines.push(`   LOT: ${lot}`);
  if (ukuran) lines.push(`   Ukuran: ${ukuran}`);
  if (ed) lines.push(`   ED: ${ed}`);
  if (satuan) lines.push(`   Satuan: ${satuan}`);
  lines.push("");
  lines.push("- IDIK-App / Portal Distributor");
  appendInfoAndSuggestion(lines, infoLink);
  return lines.join("\n");
}

function waDokterText(rows: PemakaianRow[]): string | null {
  const raw = detailDokterLine(rows);
  if (!raw) return null;
  return raw.replace(/\s*·\s*/g, " | ");
}

function appendWaPemakaianLines(
  lines: string[],
  r: PemakaianRow,
  itemNo: number,
) {
  const nama = barangDenganKategori(r);
  const qty =
    r.jumlah != null && Number(r.jumlah) !== 1 ? ` (x${r.jumlah})` : "";
  lines.push(`${itemNo}. ${nama}${qty}`);
  const lot = r.lot?.trim();
  const ukuran = r.ukuran?.trim();
  const ed = r.ed?.trim();
  const satuan = r.inventaris?.satuan?.trim();
  if (lot) lines.push(`   LOT: ${lot}`);
  if (ukuran) lines.push(`   Ukuran: ${ukuran}`);
  if (ed) lines.push(`   ED: ${ed}`);
  if (satuan) lines.push(`   Satuan: ${satuan}`);
}

/**
 * Format khusus WhatsApp: judul *tebal*, blok per field, ASCII aman.
 * (Email tetap memakai buildShareBody / buildShareBodyGroup.)
 */
function buildWhatsAppBodyFromGroup(
  rows: PemakaianRow[],
  infoLink?: string,
): string {
  if (!rows.length) return "";
  if (rows.length === 1) {
    const r = rows[0]!;
    const p = rowKParts(r);
    const lines: string[] = [];
    lines.push("Tanggal");
    lines.push(formatReceiptDate(r));
    const pasienLine = formatPasienDetailLine(r, p);
    if (pasienLine) {
      lines.push("");
      lines.push("Pasien");
      lines.push(pasienLine);
    }
    const d = r.dokter?.trim() || p.dokter?.trim();
      if (d) {
        lines.push("");
        lines.push("Dokter");
        lines.push(d);
      }
      const r_val = r.ruangan?.trim();
      if (r_val && r_val !== "—") {
        lines.push("");
        lines.push("Ruangan");
        lines.push(r_val);
      }
      lines.push("");
    lines.push("Barang dipakai");
    appendWaPemakaianLines(lines, r, 1);
    lines.push("");
    appendInfoAndSuggestion(lines, infoLink);
    return lines.join("\n");
  }

  const head = rows[0]!;
  const headParts = rowKParts(head);
  const pasienLine = formatPasienDetailLine(head, headParts);
  const dokters = waDokterText(rows);
  const ruangan = tableRuanganGroup(rows);
  const lines: string[] = [];
  lines.push("Tanggal");
  lines.push(formatReceiptDateGroup(rows));
  if (pasienLine) {
    lines.push("");
    lines.push("Pasien");
    lines.push(pasienLine);
  }
  if (dokters) {
    lines.push("");
    lines.push("Dokter");
    lines.push(dokters);
  }
  if (ruangan && ruangan !== "—") {
    lines.push("");
    lines.push("Ruangan");
    lines.push(ruangan);
  }
  lines.push("");
  lines.push("Barang dipakai");
  let n = 1;
  for (const r of rows) {
    appendWaPemakaianLines(lines, r, n);
    n += 1;
    lines.push("");
  }
  if (lines[lines.length - 1] === "") lines.pop();
  appendInfoAndSuggestion(lines, infoLink);
  return lines.join("\n");
}

function openWhatsAppShare(text: string) {
  const u = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(u, "_blank", "noopener,noreferrer");
}

function openEmailShare(subject: string, body: string) {
  const u = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = u;
}

function rowMatchesSearch(r: PemakaianRow, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  const hay = [
    r.id,
    r.tanggal,
    formatTanggalId(r.tanggal),
    r.distributor_nama ?? "",
    r.inventaris?.nama ?? "",
    r.inventaris?.kategori ?? "",
    r.keterangan ?? "",
    String(r.jumlah),
    r.order_id ?? "",
    r.pasien ?? "",
    r.dokter ?? "",
    r.ruangan ?? "",
    r.no_rm ?? "",
    r.status_order ?? "",
    r.catatan ?? "",
    r.lot ?? "",
    r.ukuran ?? "",
    r.ed ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(n);
}

function buildRowSearchText(r: PemakaianRow): string {
  return [
    r.id,
    r.tanggal,
    formatTanggalId(r.tanggal),
    r.distributor_nama ?? "",
    r.inventaris?.nama ?? "",
    r.inventaris?.kategori ?? "",
    r.keterangan ?? "",
    String(r.jumlah),
    r.order_id ?? "",
    r.pasien ?? "",
    r.dokter ?? "",
    r.ruangan ?? "",
    r.no_rm ?? "",
    r.status_order ?? "",
    r.catatan ?? "",
    r.lot ?? "",
    r.ukuran ?? "",
    r.ed ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function parseFocusOrderSet(raw: string | null): Set<string> {
  const out = new Set<string>();
  const src = String(raw ?? "").trim();
  if (!src) return out;
  for (const part of src.split("|")) {
    const v = part.trim();
    if (v) out.add(v);
  }
  return out;
}

function DistributorPemakaianPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const distributorIdParam = searchParams.get("distributor_id") ?? "";
  const focusOrderParam = searchParams.get("focus_order");
  const modeParam = searchParams.get("mode");
  const initialMode: PemakaianAdminAllMode =
    modeParam === "distributor-only" ? "distributor-only" : "raw";

  const [from, setFrom] = useState<string>(() => weekAgoISO());
  const [to, setTo] = useState<string>(() => todayISO());
  const [mode, setMode] = useState<PemakaianAdminAllMode>(initialMode);
  const [rows, setRows] = useState<PemakaianRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadHint, setLoadHint] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPt, setFilterPt] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [detailGroup, setDetailGroup] = useState<PemakaianRow[] | null>(null);
  const [sharePreview, setSharePreview] = useState<SharePreviewState | null>(
    null,
  );
  const autoOpenedFocusRef = useRef<string>("");
  const deferredRows = useDeferredValue(rows);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredFilterPt = useDeferredValue(filterPt);

  useEffect(() => {
    const nextMode: PemakaianAdminAllMode =
      modeParam === "distributor-only" ? "distributor-only" : "raw";
    setMode((prev) => (prev === nextMode ? prev : nextMode));
  }, [modeParam]);

  useEffect(() => {
    const currentMode: PemakaianAdminAllMode =
      modeParam === "distributor-only" ? "distributor-only" : "raw";
    if (currentMode === mode) return;

    const next = new URLSearchParams(searchParams.toString());
    next.set("mode", mode);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [mode, modeParam, pathname, router, searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setLoadHint(null);
    try {
      const distQ = distributorIdParam
        ? `&distributor_id=${encodeURIComponent(distributorIdParam)}`
        : "";
      const modeQ = `&mode=${encodeURIComponent(mode)}`;
      const focusQ = focusOrderParam
        ? `&focus_order=${encodeURIComponent(focusOrderParam)}`
        : "";
      const url = `/api/distributor/pemakaian?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${distQ}${modeQ}${focusQ}`;
      const { res, json } = await runDeduped(`GET:${url}`, async () => {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          data?: PemakaianRow[];
          message?: string;
          hint?: string;
        };
        return { res, json };
      });
      if (!res.ok || json?.ok === false) {
        setRows([]);
        setLoadError(
          typeof json?.message === "string"
            ? json.message
            : `Gagal memuat (${res.status})`,
        );
        return;
      }
      setRows(Array.isArray(json?.data) ? json.data : []);
      if (typeof json?.hint === "string" && json.hint.trim()) {
        setLoadHint(json.hint.trim());
      }
    } finally {
      setLoading(false);
    }
  }, [distributorIdParam, from, to, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = useMemo(() => `Pemakaian (Cathlab)`, []);

  const ptOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of deferredRows) {
      const pt = r.distributor_nama?.trim();
      if (pt) s.add(pt);
    }
    // Normalisasi: jika ada variasi case (misal "PT. A" dan "pt. a"),
    // kita ambil satu saja (biasanya yang UPPERCASE atau yang pertama muncul).
    const uniqueMap = new Map<string, string>();
    const stripPt = (s: string) =>
      s
        .toUpperCase()
        .replace(/^PT\.?\s*/u, "")
        .replace(/\s+/g, " ")
        .trim();

    for (const pt of s) {
      const key = stripPt(pt);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, key ? `PT. ${key}` : pt);
      }
    }
    return Array.from(uniqueMap.values()).sort((a, b) =>
      a.localeCompare(b, "id"),
    );
  }, [deferredRows]);

  const indexedRows = useMemo<IndexedPemakaianRow[]>(() => {
    return deferredRows.map((row) => ({
      row,
      searchText: buildRowSearchText(row),
      groupKey: mergeGroupKey(row),
    }));
  }, [deferredRows]);

  const filteredIndexedRows = useMemo(() => {
    const needle = deferredSearchQuery.trim().toLowerCase();
    return indexedRows.filter((item) => {
      if (needle && !item.searchText.includes(needle)) return false;
      if (deferredFilterPt) {
        const stripPt = (s: string) =>
          s
            .toUpperCase()
            .replace(/^PT\.?\s*/u, "")
            .replace(/\s+/g, " ")
            .trim();
        const rowPt = stripPt(item.row.distributor_nama?.trim() ?? "");
        const filterPtNorm = stripPt(deferredFilterPt);
        if (rowPt !== filterPtNorm) return false;
      }
      return true;
    });
  }, [indexedRows, deferredSearchQuery, deferredFilterPt]);

  const groupedRows = useMemo(
    () => groupPemakaianIndexedRows(filteredIndexedRows),
    [filteredIndexedRows],
  );

  const totalFiltered = groupedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = groupedRows.slice(pageStart, pageStart + pageSize);
  const showingFrom = totalFiltered === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + pageSize, totalFiltered);

  const [isMeLoading, setIsMeLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let alive = true;
    void runDeduped("GET:/api/distributor/me", async () => {
      const r = await fetch("/api/distributor/me", { cache: "no-store" });
      return r.json() as Promise<{ ok: boolean }>;
    })
      .then((j) => {
        if (!alive) return;
        setHasSession(j.ok);
      })
      .finally(() => {
        if (alive) setIsMeLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const isPublicFocusedView = !hasSession && !isMeLoading && !!focusOrderParam;

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    filterPt,
    from,
    to,
    mode,
    distributorIdParam,
    groupedRows.length,
    pageSize,
  ]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const detailHead = detailGroup?.[0] ?? null;

  const detailKParts = useMemo(
    () => parseKeteranganParts(detailHead?.keterangan),
    [detailHead?.keterangan],
  );

  const detailPasienLine = useMemo(
    () =>
      detailHead ? formatPasienDetailLine(detailHead, detailKParts) : null,
    [detailHead, detailKParts],
  );

  const detailDokterMerged = useMemo(
    () => (detailGroup?.length ? detailDokterLine(detailGroup) : null),
    [detailGroup],
  );

  const detailRuanganMerged = useMemo(
    () => (detailGroup?.length ? tableRuanganGroup(detailGroup) : null),
    [detailGroup],
  );

  const focusOrderSet = useMemo(
    () => parseFocusOrderSet(focusOrderParam),
    [focusOrderParam],
  );

  useEffect(() => {
    const focusKey = String(focusOrderParam ?? "").trim();
    if (!focusKey) return;
    if (loading) return;
    if (!groupedRows.length) return;
    if (autoOpenedFocusRef.current === focusKey) return;

    const target = groupedRows.find((grp) =>
      grp.some((r) => {
        const oid = displayOrderId(r, rowKParts(r));
        return focusOrderSet.has(oid);
      }),
    );
    if (!target) return;

    if (!isPublicFocusedView) {
      setDetailGroup(target);
    }
    autoOpenedFocusRef.current = focusKey;
  }, [
    focusOrderParam,
    focusOrderSet,
    groupedRows,
    loading,
    isPublicFocusedView,
  ]);

  const focusedDataGroup = useMemo(() => {
    if (!isPublicFocusedView) return null;
    const focusKey = String(focusOrderParam ?? "").trim();
    if (!focusKey) return null;
    const target = groupedRows.find((grp) =>
      grp.some((r) => {
        const oid = displayOrderId(r, rowKParts(r));
        return focusOrderSet.has(oid);
      }),
    );
    return target || null;
  }, [isPublicFocusedView, focusOrderParam, groupedRows, focusOrderSet]);

  const buildShareInfoLink = useCallback(
    (focusOrderIds?: string): string => {
      const qs = new URLSearchParams();
      qs.set("mode", mode);
      qs.set("from", from);
      qs.set("to", to);
      if (distributorIdParam) qs.set("distributor_id", distributorIdParam);
      if (focusOrderIds?.trim() && focusOrderIds !== "-") {
        qs.set("focus_order", focusOrderIds.trim());
      }
      const base = resolvePublicPortalBase();
      if (!base) return "";
      return `${base}${pathname}?${qs.toString()}`;
    },
    [distributorIdParam, from, mode, pathname, to],
  );

  const openSharePreview = useCallback(
    (channel: ShareChannel) => {
      const group = isPublicFocusedView ? focusedDataGroup : detailGroup;
      if (!group?.length) return;
      const focusOrderIds = displayOrderIdsGroup(group, "|");
      const infoLink = buildShareInfoLink(focusOrderIds);
      const subject = `Pemakaian alkes — ${displayOrderIdsGroup(group)}`;
      const body =
        channel === "wa"
          ? buildWhatsAppBodyFromGroup(group, infoLink)
          : buildShareBodyGroup(group, infoLink);
      setSharePreview({ channel, subject, body, infoLink });
    },
    [buildShareInfoLink, detailGroup, focusedDataGroup, isPublicFocusedView],
  );

  const sendFromPreview = useCallback(() => {
    if (!sharePreview) return;
    if (sharePreview.channel === "wa") {
      openWhatsAppShare(sharePreview.body);
    } else {
      openEmailShare(sharePreview.subject, sharePreview.body);
    }
    setSharePreview(null);
  }, [sharePreview]);

  if (isPublicFocusedView) {
    const head = focusedDataGroup?.[0] ?? null;
    const kParts = parseKeteranganParts(head?.keterangan);
    const pLine = head ? formatPasienDetailLine(head, kParts) : null;
    const dMerged = focusedDataGroup
      ? detailDokterLine(focusedDataGroup)
      : null;
    const rMerged = focusedDataGroup
      ? tableRuanganGroup(focusedDataGroup)
      : null;

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-cyan-800/60 bg-slate-950/40 p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-[#D4AF37] mb-6 border-b border-cyan-900/40 pb-4">
            Detail Pemakaian
          </h2>

          {loading ? (
            <div className="py-12 text-center text-cyan-500/80">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent mb-4" />
              <p>Memuat data pesanan...</p>
            </div>
          ) : focusedDataGroup ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-500/70 mb-1">
                      Tanggal Pesanan
                    </p>
                    <p className="text-cyan-50 text-base">
                      {formatReceiptDateGroup(focusedDataGroup)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-500/70 mb-1">
                      ID Order
                    </p>
                    <p className="text-cyan-50 text-base font-mono">
                      {displayOrderIdsGroup(focusedDataGroup)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-500/70 mb-1">
                      Pasien
                    </p>
                    <p className="text-cyan-50 text-base">{pLine || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-500/70 mb-1">
                      Ruangan
                    </p>
                    <p className="text-cyan-50 text-base">{rMerged || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-500/70 mb-1">
                      Dokter
                    </p>
                    <p className="text-cyan-50 text-base">{dMerged || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-cyan-900/50 pt-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#D4AF37] mb-4">
                  Daftar Barang Dipakai
                </p>
                <div className="space-y-4">
                  {focusedDataGroup.map((line) => (
                    <div
                      key={line.id}
                      className="rounded-lg bg-slate-900/40 border border-cyan-900/30 p-4"
                    >
                      <p className="text-cyan-50 font-medium text-lg mb-2">
                        {barangDenganKategori(line)}
                        {line.jumlah != null && Number(line.jumlah) !== 1 && (
                          <span className="text-cyan-400 ml-2">
                            (×{line.jumlah})
                          </span>
                        )}
                      </p>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        {line.lot?.trim() && (
                          <div>
                            <span className="text-cyan-500/60 mr-2">LOT:</span>
                            <span className="text-cyan-200">
                              {line.lot.trim()}
                            </span>
                          </div>
                        )}
                        {line.ukuran?.trim() && (
                          <div>
                            <span className="text-cyan-500/60 mr-2">
                              Ukuran:
                            </span>
                            <span className="text-cyan-200">
                              {line.ukuran.trim()}
                            </span>
                          </div>
                        )}
                        {line.ed?.trim() && (
                          <div>
                            <span className="text-cyan-500/60 mr-2">ED:</span>
                            <span className="text-cyan-200">
                              {line.ed.trim()}
                            </span>
                          </div>
                        )}
                        {line.inventaris?.satuan?.trim() && (
                          <div>
                            <span className="text-cyan-500/60 mr-2">
                              Satuan:
                            </span>
                            <span className="text-cyan-200">
                              {line.inventaris.satuan}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-amber-300/80">
              <p className="text-lg">
                Pesanan tidak ditemukan atau tautan sudah tidak valid.
              </p>
              <p className="text-sm mt-2 text-amber-200/50">
                Hubungi petugas Cathlab jika tautan informasi tidak menampilkan
                data.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#D4AF37]">{title}</h1>
          {loadError ? (
            <p className="text-[12px] text-amber-300/95 mt-1" role="alert">
              {loadError}
            </p>
          ) : null}
          {!loadError && rows.length === 0 && loadHint ? (
            <p className="text-[12px] text-cyan-400/80 mt-1">{loadHint}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[11px] text-cyan-400/90">
            <span className="whitespace-nowrap">Mode data</span>
            <select
              value={mode}
              onChange={(e) =>
                setMode(
                  e.target.value === "distributor-only"
                    ? "distributor-only"
                    : "raw",
                )
              }
              className="min-w-[13rem] rounded-md border border-cyan-800/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-cyan-100"
            >
              <option value="raw">Raw (Order + pemakaian mentah)</option>
              <option value="distributor-only">
                Distributor only (Order Cathlab)
              </option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-cyan-400/90">
            <span className="whitespace-nowrap">From</span>
            <DateYmdPicker
              value={from}
              onChange={setFrom}
              buttonClassName="!text-white dark:!text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-cyan-400/90">
            <span className="whitespace-nowrap">To</span>
            <DateYmdPicker
              value={to}
              onChange={setTo}
              buttonClassName="!text-white dark:!text-white"
            />
          </label>
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-cyan-400/50 bg-cyan-500/20 px-3 py-1.5 text-[12px] hover:bg-cyan-500/30"
          >
            Terapkan
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-cyan-900/50 bg-slate-950/60 px-3 py-2">
          <div className="relative flex min-w-[12rem] flex-1 items-center">
            <Search
              className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-cyan-500/70"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari: pasien, No. RM, dokter, order, barang…"
              className="w-full rounded-md border border-cyan-800/70 bg-slate-950/70 py-1.5 pl-8 pr-2 text-[12px] text-cyan-100 placeholder:text-cyan-600/50 focus:border-cyan-500/50 focus:outline-none"
              aria-label="Cari pemakaian"
            />
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-cyan-400/90">
            <span className="whitespace-nowrap">PT</span>
            <select
              value={filterPt}
              onChange={(e) => setFilterPt(e.target.value)}
              className="max-w-[200px] rounded-md border border-cyan-800/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-cyan-100"
            >
              <option value="">Semua PT</option>
              {ptOptions.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-[12px]">
            <thead className="bg-slate-950/80">
              <tr className="text-cyan-300/80">
                <Th className="w-10 min-w-8 text-right">No</Th>
                <Th>Tanggal</Th>
                <Th className="min-w-[9rem]">Nama Pasien</Th>
                <Th className="whitespace-nowrap">No. RM</Th>
                <Th className="min-w-[10rem]">Dokter</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-cyan-300/60"
                  >
                    Memuat...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-cyan-300/60"
                  >
                    {rows.length === 0
                      ? "Tidak ada data."
                      : "Tidak ada baris yang cocok dengan pencarian / filter."}
                  </td>
                </tr>
              ) : (
                pageRows.map((grp, rowIdx) => {
                  const r0 = grp[0]!;
                  const gkey = mergeGroupKey(r0);
                  return (
                    <tr
                      key={gkey}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailGroup(grp)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetailGroup(grp);
                        }
                      }}
                      className="cursor-pointer hover:bg-cyan-900/20 focus:bg-cyan-900/15 focus:outline-none"
                    >
                      <Td className="w-10 min-w-8 whitespace-nowrap align-top text-right tabular-nums text-cyan-300/85">
                        {pageStart + rowIdx + 1}
                      </Td>
                      <Td className="whitespace-nowrap align-top">
                        {formatTanggalId(String(r0.tanggal ?? ""))}
                      </Td>
                      <Td className="max-w-[14rem] align-top font-medium text-cyan-50/95">
                        <span className="line-clamp-2 leading-snug">
                          {tableNamaPasien(r0)}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap align-top tabular-nums text-cyan-100/90">
                        {tableNoRm(r0)}
                      </Td>
                      <Td className="max-w-[18rem] align-top text-cyan-100/85">
                        <span className="line-clamp-2 leading-snug">
                          {tableDokterGroup(grp)}
                        </span>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalFiltered > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cyan-900/50 px-3 py-2 text-[11px] text-cyan-400/90">
            <span className="min-w-0 text-cyan-200/90">
              Menampilkan {showingFrom} sampai {showingTo} dari {totalFiltered}
            </span>
            <div className="ms-auto flex w-full min-w-0 flex-shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
              <label className="flex items-center gap-1.5 text-[11px] text-cyan-300/90">
                <span className="whitespace-nowrap">Baris</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="min-w-[3.5rem] rounded-md border border-cyan-800/70 bg-slate-950/70 py-1 pl-1.5 pr-6 text-[11px] text-cyan-100 focus:border-cyan-500/50 focus:outline-none"
                  aria-label="Jumlah baris per halaman"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-cyan-200/30 px-2 py-1 text-[11px] text-cyan-100 transition-colors hover:bg-cyan-950/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span className="px-2 tabular-nums text-cyan-100/90">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-md border border-cyan-200/30 px-2 py-1 text-[11px] text-cyan-100 transition-colors hover:bg-cyan-950/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog
        open={detailGroup != null}
        onOpenChange={(open) => {
          if (!open) setDetailGroup(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-cyan-600/40 bg-slate-950 text-cyan-100">
          {detailGroup && detailHead ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#D4AF37]">
                  Detail pemakaian
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 rounded-lg border border-cyan-900/50 bg-slate-950/60 px-3 py-3 text-[13px] leading-relaxed">
                <p className="text-cyan-50">
                  <span className="mr-1.5" aria-hidden>
                    📅
                  </span>
                  {formatReceiptDateGroup(detailGroup)}
                </p>
                <p className="text-cyan-50">
                  <span className="mr-1.5" aria-hidden>
                    🆔
                  </span>
                  {displayOrderIdsGroup(detailGroup)}
                </p>
                {detailPasienLine ? (
                  <p className="text-cyan-50">
                    <span className="mr-1.5" aria-hidden>
                      👤
                    </span>
                    {detailPasienLine}
                  </p>
                ) : null}
                {detailRuanganMerged && detailRuanganMerged !== "—" ? (
                  <p className="text-cyan-50">
                    <span className="mr-1.5" aria-hidden>
                      📍
                    </span>
                    {detailRuanganMerged}
                  </p>
                ) : null}
                {detailDokterMerged ? (
                  <p className="text-cyan-50">
                    <span className="mr-1.5" aria-hidden>
                      🩺
                    </span>
                    {detailDokterMerged}
                  </p>
                ) : null}
                <div className="border-t border-cyan-800/40 pt-3">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#D4AF37]/95">
                    Pemakaian
                  </p>
                  <ul className="list-none space-y-3 pl-0.5">
                    {detailGroup.map((lineRow) => (
                      <li key={lineRow.id}>
                        <span className="text-cyan-100">
                          • {barangDenganKategori(lineRow)}
                          {lineRow.jumlah != null &&
                          Number(lineRow.jumlah) !== 1 ? (
                            <span className="text-cyan-400/80">
                              {" "}
                              (×{lineRow.jumlah})
                            </span>
                          ) : null}
                        </span>
                        {lineRow.lot?.trim() ? (
                          <div className="mt-1 pl-4 text-[12px] text-cyan-300/85">
                            LOT: {lineRow.lot.trim()}
                          </div>
                        ) : null}
                        {lineRow.ukuran?.trim() ? (
                          <div className="pl-4 text-[12px] text-cyan-300/85">
                            Ukuran: {lineRow.ukuran.trim()}
                          </div>
                        ) : null}
                        {lineRow.ed?.trim() ? (
                          <div className="pl-4 text-[12px] text-cyan-300/85">
                            ED: {lineRow.ed.trim()}
                          </div>
                        ) : null}
                        {lineRow.inventaris?.satuan?.trim() ? (
                          <div className="pl-4 text-[12px] text-cyan-300/85">
                            Satuan: {lineRow.inventaris.satuan}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <DialogFooter className="!mt-4 flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openSharePreview("wa")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-950/40 px-3 py-1.5 text-[12px] text-emerald-100 hover:bg-emerald-900/45"
                  >
                    <MessageCircle
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => openSharePreview("email")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/45 bg-cyan-950/35 px-3 py-1.5 text-[12px] text-cyan-100 hover:bg-cyan-900/40"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Email
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailGroup(null)}
                  className="rounded-md border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-[12px] text-cyan-100 hover:bg-cyan-500/25"
                >
                  Tutup
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={sharePreview != null}
        onOpenChange={(open) => {
          if (!open) setSharePreview(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-cyan-600/40 bg-slate-950 text-cyan-100">
          {sharePreview ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#D4AF37]">
                  Preview {sharePreview.channel === "wa" ? "WhatsApp" : "Email"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 rounded-lg border border-cyan-900/50 bg-slate-950/60 px-3 py-3">
                {sharePreview.channel === "email" ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300/85">
                      Subject
                    </p>
                    <div className="rounded-md border border-cyan-800/60 bg-slate-950/70 px-3 py-2 text-[12px] text-cyan-50">
                      {sharePreview.subject}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300/85">
                    Isi pesan
                  </p>
                  <textarea
                    readOnly
                    value={sharePreview.body}
                    className="min-h-[280px] w-full rounded-md border border-cyan-800/60 bg-slate-950/70 px-3 py-2 text-[12px] leading-relaxed text-white dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300/85">
                    Link informasi
                  </p>
                  {sharePreview.infoLink ? (
                    <a
                      href={sharePreview.infoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all rounded-md border border-cyan-800/60 bg-slate-950/70 px-3 py-2 text-[12px] text-cyan-200 underline underline-offset-2 hover:text-white"
                    >
                      {sharePreview.infoLink}
                    </a>
                  ) : (
                    <div className="rounded-md border border-amber-500/35 bg-amber-950/20 px-3 py-2 text-[12px] text-amber-200/90">
                      Link belum tersedia. Isi env{" "}
                      <code className="font-mono">NEXT_PUBLIC_APP_URL</code>{" "}
                      dengan URL Vercel produksi agar link ikut tampil.
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="!mt-4 flex-col gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setSharePreview(null)}
                  className="rounded-md border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-[12px] text-cyan-100 hover:bg-cyan-500/25"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={sendFromPreview}
                  className="rounded-md border border-emerald-500/50 bg-emerald-950/40 px-3 py-1.5 text-[12px] text-emerald-100 hover:bg-emerald-900/45"
                >
                  Kirim {sharePreview.channel === "wa" ? "WhatsApp" : "Email"}
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DistributorPemakaianPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-cyan-500/80 text-sm">
          Memuat pemakaian…
        </div>
      }
    >
      <DistributorPemakaianPageContent />
    </Suspense>
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
    <th className={`px-3 py-2 text-left font-semibold ${className}`}>
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
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

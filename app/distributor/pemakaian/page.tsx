"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Mail, MessageCircle, Search } from "lucide-react";

import { DateYmdPicker } from "@/components/ui/date-ymd-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PemakaianRow = {
  id: string;
  tanggal: string;
  jumlah: number;
  keterangan: string | null;
  inventaris: { nama: string; satuan: string | null } | null;
  distributor_nama?: string | null;
  created_at?: string | null;
  order_id?: string | null;
  pasien?: string | null;
  dokter?: string | null;
  no_rm?: string | null;
  status_order?: string | null;
  catatan?: string | null;
  tanggal_order_raw?: string | null;
  lot?: string | null;
  ukuran?: string | null;
  ed?: string | null;
};

const PAGE_SIZE = 10;

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

function buildShareBodyGroup(rows: PemakaianRow[]): string {
  if (!rows.length) return "";
  if (rows.length === 1) {
    const r = rows[0]!;
    return buildShareBody(r, rowKParts(r));
  }
  const head = rows[0]!;
  const headParts = rowKParts(head);
  const pasienLine = formatPasienDetailLine(head, headParts);
  const dokters = detailDokterLine(rows);
  const lines: string[] = [];
  lines.push(`Tanggal: ${formatReceiptDateGroup(rows)}`);
  lines.push(`ID Order: ${displayOrderIdsGroup(rows, " | ")}`);
  if (pasienLine) lines.push(`Pasien: ${pasienLine}`);
  if (dokters) lines.push(`Dokter: ${dokters.replace(/\s*·\s*/g, " | ")}`);
  const pt = head.distributor_nama?.trim();
  if (pt) lines.push(`PT / Distributor: ${pt}`);
  lines.push("");
  lines.push("Pemakaian:");
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const rp = rowKParts(r);
    const nama = r.inventaris?.nama ?? "-";
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
  return lines.join("\n");
}

/** Satu baris untuk dialog & share: "NAMA (RM)" bila RM diketahui. */
function formatPasienDetailLine(
  row: PemakaianRow,
  parts: KeteranganParts,
): string | null {
  const label = row.pasien?.trim() || parts.pasien?.trim();
  const rm =
    row.no_rm?.trim() || extractRmFromPasienLabel(label) || undefined;
  const nama = label
    ? pasienNamaTanpaRm(label) || label
    : "";
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

function buildShareBody(row: PemakaianRow, parts: KeteranganParts): string {
  const pasienLine = formatPasienDetailLine(row, parts);
  const dokterFinal = row.dokter?.trim() || parts.dokter;
  const lines: string[] = [];
  lines.push(`Tanggal: ${formatReceiptDate(row)}`);
  lines.push(`ID Order: ${displayOrderId(row, parts)}`);
  if (pasienLine) lines.push(`Pasien: ${pasienLine}`);
  if (dokterFinal) lines.push(`Dokter: ${dokterFinal}`);
  const pt = row.distributor_nama?.trim();
  if (pt) lines.push(`PT / Distributor: ${pt}`);
  lines.push("");
  lines.push("Pemakaian:");
  const nama = row.inventaris?.nama ?? "-";
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
  const nama = r.inventaris?.nama ?? "-";
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
function buildWhatsAppBodyFromGroup(rows: PemakaianRow[]): string {
  if (!rows.length) return "";
  if (rows.length === 1) {
    const r = rows[0]!;
    const p = rowKParts(r);
    const lines: string[] = [];
    lines.push("*Tanggal*");
    lines.push(formatReceiptDate(r));
    const pasienLine = formatPasienDetailLine(r, p);
    if (pasienLine) {
      lines.push("");
      lines.push("*Pasien*");
      lines.push(pasienLine);
    }
    const d = r.dokter?.trim() || p.dokter?.trim();
    if (d) {
      lines.push("");
      lines.push("*Dokter*");
      lines.push(d);
    }
    lines.push("");
    lines.push("*Barang dipakai*");
    appendWaPemakaianLines(lines, r, 1);
    lines.push("");
    return lines.join("\n");
  }

  const head = rows[0]!;
  const headParts = rowKParts(head);
  const pasienLine = formatPasienDetailLine(head, headParts);
  const dokters = waDokterText(rows);
  const lines: string[] = [];
  lines.push("*Tanggal*");
  lines.push(formatReceiptDateGroup(rows));
  if (pasienLine) {
    lines.push("");
    lines.push("*Pasien*");
    lines.push(pasienLine);
  }
  if (dokters) {
    lines.push("");
    lines.push("*Dokter*");
    lines.push(dokters);
  }
  lines.push("");
  lines.push("*Barang dipakai*");
  let n = 1;
  for (const r of rows) {
    appendWaPemakaianLines(lines, r, n);
    n += 1;
    lines.push("");
  }
  if (lines[lines.length - 1] === "") lines.pop();
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
    r.keterangan ?? "",
    String(r.jumlah),
    r.order_id ?? "",
    r.pasien ?? "",
    r.dokter ?? "",
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

function DistributorPemakaianPageContent() {
  const searchParams = useSearchParams();
  const distributorIdParam = searchParams.get("distributor_id") ?? "";

  const [from, setFrom] = useState<string>(() => weekAgoISO());
  const [to, setTo] = useState<string>(() => todayISO());
  const [rows, setRows] = useState<PemakaianRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadHint, setLoadHint] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPt, setFilterPt] = useState("");
  const [page, setPage] = useState(1);
  const [detailGroup, setDetailGroup] = useState<PemakaianRow[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setLoadHint(null);
    try {
      const distQ = distributorIdParam
        ? `&distributor_id=${encodeURIComponent(distributorIdParam)}`
        : "";
      const res = await fetch(
        `/api/distributor/pemakaian?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${distQ}`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: PemakaianRow[];
        message?: string;
        hint?: string;
      };
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
  }, [distributorIdParam, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = useMemo(() => `Pemakaian (Cathlab)`, []);

  const ptOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const pt = r.distributor_nama?.trim();
      if (pt) s.add(pt);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (!rowMatchesSearch(r, searchQuery)) return false;
      if (filterPt && (r.distributor_nama?.trim() ?? "") !== filterPt) return false;
      return true;
    });
  }, [rows, searchQuery, filterPt]);

  const groupedRows = useMemo(
    () => groupPemakaianRows(filteredRows),
    [filteredRows],
  );

  const totalFiltered = groupedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = groupedRows.slice(pageStart, pageStart + PAGE_SIZE);
  const showingFrom = totalFiltered === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + PAGE_SIZE, totalFiltered);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterPt, from, to, distributorIdParam, groupedRows.length]);

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

  const shareBodyEmail = useMemo(
    () => buildShareBodyGroup(detailGroup ?? []),
    [detailGroup],
  );

  const detailDokterMerged = useMemo(
    () => (detailGroup?.length ? detailDokterLine(detailGroup) : null),
    [detailGroup],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#D4AF37]">{title}</h1>
          <p className="text-[12px] text-cyan-300/70">
            Catatan pemakaian alkes yang diinput petugas Cathlab untuk barang
            yang mengikat ke distributor Anda: lewat stok inventaris (supplier),
            master barang, atau produk di katalog distributor.
          </p>
          {loadError ? (
            <p className="text-[12px] text-amber-300/95 mt-1" role="alert">
              {loadError}
            </p>
          ) : null}
          {!loadError && rows.length === 0 && loadHint ? (
            <p className="text-[12px] text-cyan-400/80 mt-1">{loadHint}</p>
          ) : null}
          {!loadError && !loading && rows.length === 0 ? (
            <p className="text-[11px] text-cyan-500/50 mt-1">
              Sertakan tanggal order Cathlab di rentang From–To (mis. 25 Mar
              jika order tercatat tanggal itu).
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <DateYmdPicker
            label="From"
            value={from}
            onChange={setFrom}
            clearable={false}
            className="text-cyan-300/70"
          />
          <DateYmdPicker
            label="To"
            value={to}
            onChange={setTo}
            clearable={false}
            className="text-cyan-300/70"
          />
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
                    colSpan={4}
                    className="px-3 py-6 text-center text-cyan-300/60"
                  >
                    Memuat...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-cyan-300/60"
                  >
                    {rows.length === 0
                      ? "Tidak ada data."
                      : "Tidak ada baris yang cocok dengan pencarian / filter."}
                  </td>
                </tr>
              ) : (
                pageRows.map((grp) => {
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
            <span>
              Menampilkan {showingFrom}–{showingTo} dari {totalFiltered}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-cyan-800/70 px-2 py-1 text-[11px] text-cyan-200 disabled:opacity-40 hover:bg-cyan-950/60"
              >
                Sebelumnya
              </button>
              <span className="px-2 tabular-nums">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border border-cyan-800/70 px-2 py-1 text-[11px] text-cyan-200 disabled:opacity-40 hover:bg-cyan-950/60"
              >
                Berikutnya
              </button>
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
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-cyan-600/40 bg-slate-950/95 text-cyan-100">
          {detailGroup && detailHead ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#D4AF37]">
                  Detail pemakaian
                </DialogTitle>
                <DialogDescription className="text-[11px] text-cyan-500/75">
                  {detailGroup.length > 1 ? (
                    <span className="block text-cyan-400/80 mb-1">
                      {detailGroup.length} item digabung (sama tanggal, pasien &
                      PT)
                    </span>
                  ) : null}
                  <span className="text-cyan-500/75">Baris teknis: </span>
                  <code className="break-all font-mono text-cyan-300/90">
                    {detailGroup.map((r) => r.id).join(" · ")}
                  </code>
                </DialogDescription>
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
                {detailDokterMerged ? (
                  <p className="text-cyan-50">
                    <span className="mr-1.5" aria-hidden>
                      🩺
                    </span>
                    {detailDokterMerged}
                  </p>
                ) : null}
                {detailHead.distributor_nama?.trim() ? (
                  <p className="text-cyan-200/90">
                    <span className="mr-1.5" aria-hidden>
                      🏢
                    </span>
                    {detailHead.distributor_nama.trim()}
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
                            • {lineRow.inventaris?.nama ?? "—"}
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
                    onClick={() =>
                      openWhatsAppShare(
                        buildWhatsAppBodyFromGroup(detailGroup ?? []),
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-950/40 px-3 py-1.5 text-[12px] text-emerald-100 hover:bg-emerald-900/45"
                  >
                    <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openEmailShare(
                        `Pemakaian alkes — ${displayOrderIdsGroup(detailGroup)}`,
                        shareBodyEmail,
                      )
                    }
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

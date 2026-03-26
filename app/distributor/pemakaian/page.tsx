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

function displayOrderId(row: PemakaianRow, parts: KeteranganParts): string {
  return (
    row.order_id?.trim() ||
    parts.order?.trim() ||
    row.id.split("__")[0]?.trim() ||
    row.id
  );
}

function buildShareBody(row: PemakaianRow, parts: KeteranganParts): string {
  const pasien = row.pasien?.trim() || parts.pasien;
  const dokterFinal = row.dokter?.trim() || parts.dokter;
  const lines: string[] = [];
  lines.push(`📅 ${formatReceiptDate(row)}`);
  lines.push(`🆔 ${displayOrderId(row, parts)}`);
  if (pasien) lines.push(`👤 ${pasien}`);
  if (dokterFinal) lines.push(`🩺 ${dokterFinal}`);
  const pt = row.distributor_nama?.trim();
  if (pt) lines.push(`🏢 ${pt}`);
  lines.push("");
  lines.push("Pemakaian:");
  const nama = row.inventaris?.nama ?? "—";
  const bullet = `• ${nama}${row.jumlah != null && Number(row.jumlah) !== 1 ? ` (×${row.jumlah})` : ""}`;
  lines.push(bullet);
  const lot = row.lot?.trim();
  const ukuran = row.ukuran?.trim();
  const ed = row.ed?.trim();
  const satuan = row.inventaris?.satuan?.trim();
  if (lot) lines.push(`   LOT: ${lot}`);
  if (ukuran) lines.push(`   Ukuran: ${ukuran}`);
  if (ed) lines.push(`   ED: ${ed}`);
  if (satuan) lines.push(`   Satuan: ${satuan}`);
  const st = row.status_order?.trim() || parts.status;
  if (st) lines.push(`   Status: ${st}`);
  const cat = row.catatan?.trim() || parts.cat;
  if (cat) lines.push(`   Catatan: ${cat}`);
  lines.push("");
  lines.push("— IDIK-App • Portal Distributor");
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
  const [detailRow, setDetailRow] = useState<PemakaianRow | null>(null);

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

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterPt, from, to, distributorIdParam, rows.length]);

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

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE);
  const showingFrom = totalFiltered === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + PAGE_SIZE, totalFiltered);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const detailKParts = useMemo(
    () => parseKeteranganParts(detailRow?.keterangan),
    [detailRow?.keterangan],
  );

  const shareBody = useMemo(
    () => (detailRow ? buildShareBody(detailRow, detailKParts) : ""),
    [detailRow, detailKParts],
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
              placeholder="Cari: barang, pasien, order, PT…"
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
                <Th className="min-w-[10rem]">PT / Distributor</Th>
                <Th>Barang</Th>
                <Th className="text-right">Qty</Th>
                <Th className="min-w-[10rem]">Keterangan</Th>
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
                pageRows.map((r) => (
                  <tr
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailRow(r)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailRow(r);
                      }
                    }}
                    className="cursor-pointer hover:bg-cyan-900/20 focus:bg-cyan-900/15 focus:outline-none"
                  >
                    <Td className="whitespace-nowrap">
                      {formatTanggalId(String(r.tanggal ?? ""))}
                    </Td>
                    <Td className="max-w-[12rem] whitespace-normal break-words align-top text-cyan-100/90">
                      {r.distributor_nama?.trim() ? r.distributor_nama : "—"}
                    </Td>
                    <Td className="align-top font-medium text-cyan-50/95">
                      {r.inventaris?.nama ?? "-"}
                    </Td>
                    <Td className="text-right tabular-nums align-top">
                      {r.jumlah}
                    </Td>
                    <Td className="max-w-[14rem] align-top text-cyan-100/85">
                      <span className="line-clamp-2 leading-snug">
                        {r.keterangan ?? "—"}
                      </span>
                    </Td>
                  </tr>
                ))
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
        open={detailRow != null}
        onOpenChange={(open) => {
          if (!open) setDetailRow(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-cyan-600/40 bg-slate-950/95 text-cyan-100">
          {detailRow ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#D4AF37]">
                  Detail pemakaian
                </DialogTitle>
                <DialogDescription className="text-[11px] text-cyan-500/75">
                  Baris teknis:{" "}
                  <code className="break-all font-mono text-cyan-300/90">
                    {detailRow.id}
                  </code>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 rounded-lg border border-cyan-900/50 bg-slate-950/60 px-3 py-3 text-[13px] leading-relaxed">
                <p className="text-cyan-50">
                  <span className="mr-1.5" aria-hidden>
                    📅
                  </span>
                  {formatReceiptDate(detailRow)}
                </p>
                <p className="text-cyan-50">
                  <span className="mr-1.5" aria-hidden>
                    🆔
                  </span>
                  {displayOrderId(detailRow, detailKParts)}
                </p>
                {(detailRow.pasien?.trim() || detailKParts.pasien) ? (
                  <p className="text-cyan-50">
                    <span className="mr-1.5" aria-hidden>
                      👤
                    </span>
                    {detailRow.pasien?.trim() || detailKParts.pasien}
                  </p>
                ) : null}
                {(detailRow.dokter?.trim() || detailKParts.dokter) ? (
                  <p className="text-cyan-50">
                    <span className="mr-1.5" aria-hidden>
                      🩺
                    </span>
                    {detailRow.dokter?.trim() || detailKParts.dokter}
                  </p>
                ) : null}
                {detailRow.distributor_nama?.trim() ? (
                  <p className="text-cyan-200/90">
                    <span className="mr-1.5" aria-hidden>
                      🏢
                    </span>
                    {detailRow.distributor_nama.trim()}
                  </p>
                ) : null}

                <div className="border-t border-cyan-800/40 pt-3">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#D4AF37]/95">
                    Pemakaian
                  </p>
                  <ul className="list-none space-y-2 pl-0.5">
                    <li>
                      <span className="text-cyan-100">
                        • {detailRow.inventaris?.nama ?? "—"}
                        {detailRow.jumlah != null && Number(detailRow.jumlah) !== 1 ? (
                          <span className="text-cyan-400/80">
                            {" "}
                            (×{detailRow.jumlah})
                          </span>
                        ) : null}
                      </span>
                      {detailRow.lot?.trim() ? (
                        <div className="mt-1 pl-4 text-[12px] text-cyan-300/85">
                          LOT: {detailRow.lot.trim()}
                        </div>
                      ) : null}
                      {detailRow.ukuran?.trim() ? (
                        <div className="pl-4 text-[12px] text-cyan-300/85">
                          Ukuran: {detailRow.ukuran.trim()}
                        </div>
                      ) : null}
                      {detailRow.ed?.trim() ? (
                        <div className="pl-4 text-[12px] text-cyan-300/85">
                          ED: {detailRow.ed.trim()}
                        </div>
                      ) : null}
                      {detailRow.inventaris?.satuan?.trim() ? (
                        <div className="pl-4 text-[12px] text-cyan-300/85">
                          Satuan: {detailRow.inventaris.satuan}
                        </div>
                      ) : null}
                    </li>
                  </ul>
                </div>

                {(detailRow.status_order?.trim() || detailKParts.status) ? (
                  <p className="text-[12px] text-cyan-400/85">
                    Status alur:{" "}
                    <span className="text-cyan-200">
                      {detailRow.status_order?.trim() || detailKParts.status}
                    </span>
                  </p>
                ) : null}
                {(detailRow.catatan?.trim() || detailKParts.cat) ? (
                  <p className="text-[12px] text-cyan-400/85">
                    Catatan:{" "}
                    <span className="whitespace-pre-wrap break-words text-cyan-100/90">
                      {detailRow.catatan?.trim() || detailKParts.cat}
                    </span>
                  </p>
                ) : null}
              </div>

              <DialogFooter className="!mt-4 flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openWhatsAppShare(shareBody)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-950/40 px-3 py-1.5 text-[12px] text-emerald-100 hover:bg-emerald-900/45"
                  >
                    <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openEmailShare(
                        `Pemakaian alkes — ${displayOrderId(detailRow, detailKParts)}`,
                        shareBody,
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
                  onClick={() => setDetailRow(null)}
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

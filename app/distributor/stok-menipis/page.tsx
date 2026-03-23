"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DISTRIBUTOR_PRODUK_KATEGORI } from "@/lib/distributorCatalog";

type Row = {
  id: string;
  nama: string;
  kategori: string | null;
  satuan: string | null;
  stok: number | null;
  min_stok: number | null;
};

type Summary = {
  total_menipis: number;
  zero_stock: number;
  low_stock: number;
  categories_affected: number;
};

const PAGE_SIZES = [10, 20, 50] as const;

function DistributorStokMenipisPageContent() {
  const searchParams = useSearchParams();
  const distributorIdParam = searchParams.get("distributor_id") ?? "";

  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [qInput, setQInput] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [kategori, setKategori] = useState("");
  const [status, setStatus] = useState<"all" | "zero" | "low">("all");

  const title = useMemo(() => "Stok Menipis (Cathlab)", []);

  const buildUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (distributorIdParam) p.set("distributor_id", distributorIdParam);
    p.set("page", String(page));
    p.set("page_size", String(pageSize));
    if (qApplied.trim()) p.set("q", qApplied.trim());
    if (kategori) p.set("kategori", kategori);
    if (status !== "all") p.set("status", status);
    return `/api/distributor/stok-menipis?${p.toString()}`;
  }, [distributorIdParam, page, pageSize, qApplied, kategori, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(buildUrl(), { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) {
        setErr(json?.message ?? "Gagal memuat");
        setRows([]);
        setSummary(null);
        setTotal(0);
        return;
      }
      setRows((json?.data ?? []) as Row[]);
      setSummary((json?.summary ?? null) as Summary | null);
      setTotal(Number(json?.total ?? 0));
    } catch {
      setErr("Gagal memuat");
      setRows([]);
      setSummary(null);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQApplied(qInput);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(1);
  }, [kategori, status, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const pageSafe = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe);
  }, [page, pageSafe]);

  const fromRow = total === 0 ? 0 : (pageSafe - 1) * pageSize + 1;
  const toRow = Math.min(pageSafe * pageSize, total);

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-[#D4AF37]">{title}</h1>
          <p className="text-[12px] text-cyan-300/70 max-w-2xl">
            Item inventaris Cathlab milik distributor Anda yang stoknya di bawah min_stok (sesuai
            mapping produk atau nilai di inventaris bila belum ada mapping).
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="self-start sm:self-auto px-3 py-1.5 rounded-md text-[12px] bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30"
        >
          Refresh
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
          <KpiCard
            label="Total menipis"
            value={summary.total_menipis}
            hint="Sesuai filter di bawah"
          />
          <KpiCard label="Stok habis" value={summary.zero_stock} hint="Sisa ≤ 0" />
          <KpiCard
            label="Kritis (sisa > 0)"
            value={summary.low_stock}
            hint="Masih ada stok tapi di bawah min"
          />
          <KpiCard label="Kategori terdampak" value={summary.categories_affected} hint="Unik" />
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-2 xl:items-end xl:justify-between shrink-0">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
          <label className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[11px] text-cyan-300/60">Cari nama / kategori</span>
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Ketik untuk menyaring…"
              className="w-full rounded-lg border border-cyan-900/60 bg-slate-950/60 px-3 py-2 text-[12px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50"
            />
          </label>
          <div className="w-full sm:w-44 shrink-0">
            <Labeled label="Kategori (alkes)">
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-[12px] text-white"
              >
                <option value="">— Pilih —</option>
                {DISTRIBUTOR_PRODUK_KATEGORI.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Labeled>
          </div>
          <label className="flex flex-col gap-1 w-full sm:w-44">
            <span className="text-[11px] text-cyan-300/60">Status stok</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "all" | "zero" | "low")}
              className="rounded-lg border border-cyan-900/60 bg-slate-950/60 px-3 py-2 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50"
            >
              <option value="all">Semua</option>
              <option value="zero">Habis / nol</option>
              <option value="low">Masih ada, di bawah min</option>
            </select>
          </label>
        </div>
      </div>

      {err && (
        <p className="text-[12px] text-red-400/90 shrink-0" role="alert">
          {err}
        </p>
      )}

      <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 overflow-hidden flex flex-col flex-1 min-h-[240px]">
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full text-[12px]">
            <thead className="bg-slate-950/80 sticky top-0 z-[1]">
              <tr className="text-cyan-300/80">
                <Th>Nama</Th>
                <Th>Kategori</Th>
                <Th className="text-right">Sisa</Th>
                <Th className="text-right">Min</Th>
                <Th>Satuan</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-cyan-300/60">
                    Memuat...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-cyan-300/60">
                    Tidak ada item menipis.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-cyan-900/10">
                    <Td>{r.nama}</Td>
                    <Td>{r.kategori ?? "-"}</Td>
                    <Td className="text-right tabular-nums">{r.stok ?? 0}</Td>
                    <Td className="text-right tabular-nums">{r.min_stok ?? 0}</Td>
                    <Td>{r.satuan ?? "-"}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5 border-t border-cyan-900/50 bg-slate-950/50 text-[11px] text-cyan-300/70 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {total === 0 ? "0" : `${fromRow}–${toRow}`} dari {total} item
            </span>
            <label className="inline-flex items-center gap-1.5">
              <span className="text-cyan-300/50">Per halaman</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded border border-cyan-900/60 bg-slate-950/80 px-2 py-1 text-[11px] text-white"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageSafe <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-cyan-800/60 hover:bg-cyan-900/30 disabled:opacity-40 disabled:pointer-events-none"
            >
              Sebelumnya
            </button>
            <span className="tabular-nums text-cyan-200/90">
              {pageSafe} / {totalPages}
            </span>
            <button
              type="button"
              disabled={pageSafe >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 rounded border border-cyan-800/60 hover:bg-cyan-900/30 disabled:opacity-40 disabled:pointer-events-none"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DistributorStokMenipisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-cyan-500/80 text-sm">
          Memuat stok menipis…
        </div>
      }
    >
      <DistributorStokMenipisPageContent />
    </Suspense>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-[#D4AF37]/25 bg-slate-950/50 px-3 py-2.5 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.06)]">
      <p className="text-[10px] uppercase tracking-wide text-cyan-300/55">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-[#D4AF37]">{value}</p>
      <p className="text-[10px] text-cyan-300/45 mt-0.5">{hint}</p>
    </div>
  );
}

function Labeled(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-cyan-300">
      <span className="font-semibold text-cyan-200">{props.label}</span>
      {props.children}
    </label>
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
    <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>
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

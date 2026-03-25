"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type PemakaianRow = {
  id: string;
  tanggal: string;
  jumlah: number;
  keterangan: string | null;
  inventaris: { nama: string; satuan: string | null } | null;
};

function todayISO() {
  const d = new Date();
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

function DistributorPemakaianPageContent() {
  const searchParams = useSearchParams();
  const distributorIdParam = searchParams.get("distributor_id") ?? "";

  const [from, setFrom] = useState<string>(() => todayISO());
  const [to, setTo] = useState<string>(() => todayISO());
  const [rows, setRows] = useState<PemakaianRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
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
    } finally {
      setLoading(false);
    }
  }, [distributorIdParam, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = useMemo(() => `Pemakaian (Cathlab)`, []);

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
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <label className="text-cyan-300/70">
            From{" "}
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="ml-1 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1"
            />
          </label>
          <label className="text-cyan-300/70">
            To{" "}
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="ml-1 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1"
            />
          </label>
          <button
            onClick={load}
            className="px-3 py-1.5 rounded-md bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30"
          >
            Terapkan
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12px]">
            <thead className="bg-slate-950/80">
              <tr className="text-cyan-300/80">
                <Th>Tanggal</Th>
                <Th>Barang</Th>
                <Th className="text-right">Qty</Th>
                <Th>Satuan</Th>
                <Th>Keterangan</Th>
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
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-cyan-300/60"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-cyan-900/10">
                    <Td className="whitespace-nowrap">
                      {formatTanggalId(String(r.tanggal ?? ""))}
                    </Td>
                    <Td>{r.inventaris?.nama ?? "-"}</Td>
                    <Td className="text-right tabular-nums">{r.jumlah}</Td>
                    <Td>{r.inventaris?.satuan ?? "-"}</Td>
                    <Td className="max-w-[360px] truncate">
                      {r.keterangan ?? "-"}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type StagingRow = {
  id: string;
  distributor_id?: string;
  created_at: string;
  qty: number;
  status: string;
  nota_nomor: string | null;
  master_barang: { kode: string; nama: string } | null;
  distributor_barang: {
    kode_distributor: string | null;
    lot: string | null;
    ukuran: string | null;
  } | null;
};

function fmtReceiptDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function PanelReturClient() {
  const searchParams = useSearchParams();
  const distributorId = (searchParams.get("distributor_id") ?? "").trim();

  const [rows, setRows] = useState<StagingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  /** Disimpan ke event retur sebagai penerima_petugas — sama dengan kolom Histori retur. */
  const [petugasMelayani, setPetugasMelayani] = useState("");
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const u = `/api/distributor/retur-staging${distributorId ? `?distributor_id=${encodeURIComponent(distributorId)}` : ""}`;
    try {
      const res = await fetch(u, { cache: "no-store" });
      const j = await res.json();
      if (!j?.ok) {
        setErr(typeof j?.message === "string" ? j.message : "Gagal memuat");
        setRows([]);
        return;
      }
      setRows(Array.isArray(j.data) ? j.data : []);
    } catch {
      setErr("Gagal memuat");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [distributorId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Hanya retur yang masih diproses di panel; selesai & batal ada di Histori retur. */
  const activeRows = useMemo(
    () =>
      rows.filter(
        (r) => r.status === "DRAFT" || r.status === "SIAP_RETUR",
      ),
    [rows],
  );

  const selectableIds = useMemo(
    () => activeRows.map((r) => r.id),
    [activeRows],
  );
  const selectedBatchIds = activeRows
    .filter((r) => selected[r.id])
    .map((r) => r.id);

  const allSelectableSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selected[id]);
  const someSelectableSelected = selectableIds.some((id) => selected[id]);

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate =
      someSelectableSelected && !allSelectableSelected;
  }, [someSelectableSelected, allSelectableSelected, selectableIds.length]);

  const toggleSelectAll = () => {
    if (selectableIds.length === 0) return;
    const turnOn = !allSelectableSelected;
    setSelected((s) => {
      const next = { ...s };
      for (const id of selectableIds) {
        next[id] = turnOn;
      }
      return next;
    });
  };

  const resolveDistributorIdForRow = (rowId: string) => {
    if (distributorId) return distributorId;
    const row = rows.find((r) => r.id === rowId);
    return (row?.distributor_id ?? "").trim();
  };

  const patchRow = async (id: string, action: "cancel") => {
    setBusyId(id);
    setErr(null);
    try {
      const scope = resolveDistributorIdForRow(id);
      const res = await fetch(`/api/distributor/retur-staging/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(scope ? { distributor_id: scope } : {}),
        }),
      });
      const j = await res.json();
      if (!j?.ok) {
        setErr(typeof j?.message === "string" ? j.message : "Gagal");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const historiHref = distributorId
    ? `/distributor/riwayat?distributor_id=${encodeURIComponent(distributorId)}&event_type=KATALOG_RETUR`
    : "/distributor/riwayat?event_type=KATALOG_RETUR";

  const finalize = async () => {
    if (selectedBatchIds.length === 0) {
      setErr("Centang minimal satu baris retur.");
      return;
    }
    const selectedRows = activeRows.filter((r) => selected[r.id]);
    const distFromRows = [
      ...new Set(
        selectedRows
          .map((r) => (r.distributor_id ?? "").trim())
          .filter(Boolean),
      ),
    ];
    if (distFromRows.length > 1) {
      setErr("Batch: pilih baris dari satu distributor saja.");
      return;
    }
    const scopeForFinalize =
      distributorId || distFromRows[0] || "";
    if (!scopeForFinalize) {
      setErr("Tidak bisa menentukan distributor; muat ulang halaman.");
      return;
    }
    setFinalizeLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/distributor/retur-staging/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedBatchIds,
          distributor_id: scopeForFinalize,
          penerima_petugas: petugasMelayani.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!j?.ok) {
        setErr(typeof j?.message === "string" ? j.message : "Gagal menyelesaikan");
        return;
      }
      setSelected({});
      setPetugasMelayani("");
      await load();
      if (j.nota_nomor) {
        alert(
          `Retur selesai. Nota: ${j.nota_nomor}\n\nDetail ada di menu Histori retur.`,
        );
      }
    } finally {
      setFinalizeLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-[#D4AF37]">Panel retur</h1>
          <p className="text-[12px] text-cyan-300/70 max-w-xl">
            Baris dari <strong className="text-cyan-200/90">Keluarkan</strong> di halaman
            Barang. Stok sudah dikurangi. Retur yang sudah diproses (nota) tercatat di{" "}
            <Link href={historiHref} className="text-amber-200/90 underline underline-offset-2">
              Histori retur
            </Link>
            , bukan di halaman ini.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end shrink-0">
          <Link
            href={historiHref}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-[#D4AF37]/50 text-amber-100/95 hover:bg-amber-950/40"
          >
            Histori retur →
          </Link>
          <Link
            href={
              distributorId
                ? `/distributor/barang?distributor_id=${encodeURIComponent(distributorId)}`
                : "/distributor/barang"
            }
            className="text-[11px] px-3 py-1.5 rounded-lg border border-cyan-800/70 text-cyan-200 hover:bg-slate-900/80"
          >
            ← Barang
          </Link>
        </div>
      </div>

      {err ? (
        <p className="text-[11px] text-amber-400/90">{err}</p>
      ) : null}

      {/* Lembar kwitansi — sempit di mobile, memanjang di desktop */}
      <div className="w-full max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto min-w-0">
        <div
          className="relative rounded-sm border-2 border-dashed border-[#D4AF37]/50 bg-gradient-to-b from-slate-900/95 via-slate-950/98 to-[#020617] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6 xl:px-10 shadow-[0_0_32px_rgba(212,175,55,0.12),inset_0_1px_0_rgba(255,255,255,0.04)]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(212,175,55,0.06) 24px)",
          }}
        >
          <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

          <div className="text-center pb-4 border-b border-dashed border-[#D4AF37]/35">
            <div className="text-[10px] tracking-[0.35em] text-[#D4AF37]/95 uppercase font-medium">
              Bukti retur staging
            </div>
            <div className="mt-1 text-[11px] text-cyan-400/85 font-mono">
              IDIK-App · Cathlab
            </div>
            <p className="mt-2 text-[10px] sm:text-[11px] text-cyan-500/75 leading-relaxed px-0.5 sm:px-1 text-balance">
              Centang baris yang akan diproses dengan satu nota, atau batalkan untuk
              kembalikan stok ke Cathlab.
            </p>
          </div>

          {loading ? (
            <p className="text-center text-[12px] text-cyan-400/80 py-8">Memuat…</p>
          ) : activeRows.length === 0 ? (
            <div className="text-center py-8 px-2 space-y-2">
              <p className="text-[12px] text-cyan-400/80">
                Tidak ada retur aktif di panel.
              </p>
              <p className="text-[10px] text-cyan-500/70">
                Tambah lewat <strong className="text-cyan-300/85">Keluarkan</strong> di
                Barang. Retur yang sudah bernota ada di{" "}
                <Link href={historiHref} className="text-amber-200/90 underline">
                  Histori retur
                </Link>
                .
              </p>
            </div>
          ) : (
            <div>
              {selectableIds.length > 0 ? (
                <label className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3 px-0.5 cursor-pointer select-none">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelectableSelected}
                    onChange={() => toggleSelectAll()}
                    className="accent-amber-500/90"
                    aria-label="Pilih semua baris retur"
                  />
                  <span className="text-[11px] text-cyan-200/90">
                    Pilih semua{" "}
                    <span className="text-cyan-500/80">
                      ({selectableIds.length} baris)
                    </span>
                  </span>
                </label>
              ) : null}
              <ul className="space-y-0">
              {activeRows.map((r, idx) => {
                const canCancel =
                  r.status === "DRAFT" || r.status === "SIAP_RETUR";
                const disabled = busyId === r.id;
                const nama =
                  r.master_barang?.nama?.trim() ||
                  r.master_barang?.kode ||
                  "—";
                const lineMeta = [
                  r.distributor_barang?.lot
                    ? `LOT ${r.distributor_barang.lot}`
                    : null,
                  r.distributor_barang?.ukuran || null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li key={r.id}>
                    {idx > 0 ? (
                      <div className="border-t border-dotted border-cyan-800/50 my-3" />
                    ) : null}
                    <div className="flex gap-2.5 sm:gap-3 min-w-0">
                      <div className="shrink-0 pt-0.5">
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={Boolean(selected[r.id])}
                          onChange={(e) =>
                            setSelected((s) => ({
                              ...s,
                              [r.id]: e.target.checked,
                            }))
                          }
                          className="accent-amber-500/90 size-4 shrink-0"
                          aria-label="Pilih retur"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="text-[11px] sm:text-[12px] font-semibold text-cyan-50 leading-snug break-words">
                          {nama}
                        </div>
                        {/* Mobile: bertumpuk. Tablet/desktop (md+): LOT | Qty·tanggal | Batal memanjang */}
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-x-6 md:gap-y-2 min-w-0">
                          {lineMeta ? (
                            <div className="text-[10px] text-cyan-500/85 font-mono break-all sm:break-words md:flex-1 md:min-w-0 md:text-[11px]">
                              {lineMeta}
                            </div>
                          ) : (
                            <div className="hidden md:block md:flex-1 md:min-w-0" />
                          )}
                          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-0.5 text-[11px] md:shrink-0">
                            <span className="text-cyan-200/90 tabular-nums whitespace-nowrap">
                              Qty: <strong>{r.qty}</strong>
                            </span>
                            <span className="hidden sm:inline text-cyan-600/80">·</span>
                            <span className="text-[10px] sm:text-[11px] text-cyan-500/75 font-mono break-words md:whitespace-nowrap">
                              {fmtReceiptDate(r.created_at)}
                            </span>
                          </div>
                          {canCancel ? (
                            <div className="w-full min-[380px]:w-auto md:w-auto md:shrink-0">
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  if (
                                    !confirm(
                                      "Batalkan baris ini? Stok akan dikembalikan ke Cathlab.",
                                    )
                                  )
                                    return;
                                  void patchRow(r.id, "cancel");
                                }}
                                className="w-full min-[380px]:w-auto md:w-max md:min-w-[10rem] px-2.5 py-1.5 sm:py-1 rounded-md text-[10px] border border-rose-600/55 text-rose-100 hover:bg-rose-950/35 text-center"
                              >
                                Batal (kembalikan stok)
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
              </ul>
              <div className="mt-4 space-y-2">
                <label className="block text-[10px] text-cyan-300/90">
                  Nama petugas yang melayani
                  <input
                    value={petugasMelayani}
                    onChange={(e) => setPetugasMelayani(e.target.value)}
                    placeholder="Opsional — tampil di Histori retur"
                    className="mt-1 w-full bg-slate-950/80 border border-cyan-900/70 rounded-md px-2.5 py-2 text-[11px] text-cyan-100 placeholder:text-cyan-600/50"
                    maxLength={200}
                    autoComplete="name"
                  />
                </label>
                <p className="text-[9px] text-cyan-500/70">
                  Disinkronkan dengan kolom{" "}
                  <strong className="text-cyan-400/85">Penerima (petugas)</strong> di
                  Histori retur.
                </p>
              </div>
              <button
                type="button"
                disabled={finalizeLoading || selectedBatchIds.length === 0}
                onClick={() => void finalize()}
                className="mt-3 w-full px-3 py-2.5 sm:py-2 rounded-md text-[11px] font-semibold border border-amber-500/55 bg-amber-950/45 text-amber-100 hover:bg-amber-900/40 disabled:opacity-50"
              >
                {finalizeLoading
                  ? "Memproses…"
                  : `Proses retur terpilih (${selectedBatchIds.length})`}
              </button>
            </div>
          )}

          <div className="mt-6 pt-3 border-t border-dashed border-[#D4AF37]/30 text-center text-[9px] text-cyan-600/80 font-mono tracking-tight">
            — akhir bukti staging —
          </div>
        </div>
      </div>

      <p className="text-[10px] text-cyan-500/70 max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto text-center px-2 sm:px-0 text-balance">
        Administrator: filter distributor di header atau{" "}
        <code className="text-cyan-400/90">?distributor_id=…</code>. Tanpa filter,
        semua baris aktif (semua PT) ditampilkan.
      </p>
    </div>
  );
}

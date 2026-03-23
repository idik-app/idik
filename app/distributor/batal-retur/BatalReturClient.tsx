"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  canRestoreKatalogRetur,
  parseDistributorEventPayload,
} from "@/lib/distributorReturSnapshot";
import { RETUR_FISIK_STATUS } from "@/lib/distributorReturFisik";
import {
  type BarangRow,
  type EventRow,
  notaReturComputed,
  payloadStr,
  petugasDisplay,
  returFisikEffective,
  notaPengirimanDisplay,
  RETUR_FISIK_LABEL,
} from "../riwayat/riwayatShared";

export default function BatalReturClient() {
  const searchParams = useSearchParams();
  const distributorId = (searchParams.get("distributor_id") ?? "").trim();

  const [adminView, setAdminView] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [barangRows, setBarangRows] = useState<BarangRow[]>([]);
  const [masterLabelsExtra, setMasterLabelsExtra] = useState<
    Record<string, { kode: string; nama: string }>
  >({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [qInput, setQInput] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [returFisikStatus, setReturFisikStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [batalLoading, setBatalLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [cancelledBatalRows, setCancelledBatalRows] = useState<EventRow[]>(
    [],
  );

  useEffect(() => {
    let alive = true;
    fetch("/api/distributor/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setAdminView(j?.mode === "admin_view");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const distQ =
    distributorId === ""
      ? ""
      : `?distributor_id=${encodeURIComponent(distributorId)}`;

  useEffect(() => {
    let alive = true;
    if (!distributorId && adminView) return;

    const evQ = new URLSearchParams();
    if (distributorId) evQ.set("distributor_id", distributorId);
    evQ.set("page", String(page));
    evQ.set("page_size", String(pageSize));
    evQ.set("event_type", "KATALOG_RETUR");
    if (qApplied) evQ.set("q", qApplied);
    if (from) evQ.set("from", from);
    if (to) evQ.set("to", to);
    if (returFisikStatus) evQ.set("retur_fisik_status", returFisikStatus);

    const cancelQ = new URLSearchParams();
    if (distributorId) cancelQ.set("distributor_id", distributorId);
    cancelQ.set("page", "1");
    cancelQ.set("page_size", "500");
    cancelQ.set("event_type", "RETUR_DIBATALKAN");

    setLoading(true);
    setErr(null);

    Promise.all([
      fetch(`/api/distributor/events?${evQ.toString()}`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(`/api/distributor/events?${cancelQ.toString()}`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(`/api/distributor/produk${distQ}`, { cache: "no-store" }).then(
        (r) => r.json(),
      ),
    ])
      .then(([evRes, cancelRes, barRes]) => {
        if (!alive) return;
        if (!evRes?.ok) {
          setErr(evRes?.message ?? "Gagal memuat data");
          setEvents([]);
          setMasterLabelsExtra({});
          setTotal(0);
          setCancelledBatalRows([]);
          return;
        }
        setMasterLabelsExtra(
          (evRes.master_labels ?? {}) as Record<
            string,
            { kode: string; nama: string }
          >,
        );
        setTotal(Number(evRes.total ?? (evRes.data ?? []).length));
        setEvents((evRes.data ?? []) as EventRow[]);
        if (cancelRes?.ok && Array.isArray(cancelRes.data)) {
          setCancelledBatalRows(cancelRes.data as EventRow[]);
        } else {
          setCancelledBatalRows([]);
        }
        if (!barRes?.ok) {
          setBarangRows([]);
          return;
        }
        setBarangRows((barRes.data ?? []) as BarangRow[]);
      })
      .catch(() => {
        if (!alive) return;
        setErr("Gagal memuat");
        setEvents([]);
        setTotal(0);
        setCancelledBatalRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [
    distributorId,
    adminView,
    page,
    qApplied,
    from,
    to,
    returFisikStatus,
    distQ,
    refreshTick,
  ]);

  const cancelledReturIds = useMemo(() => {
    const s = new Set<string>();
    for (const ev of cancelledBatalRows) {
      if (ev.event_type !== "RETUR_DIBATALKAN") continue;
      const oid = payloadStr(
        parseDistributorEventPayload(ev.payload).original_event_id,
      );
      if (oid) s.add(oid);
    }
    return s;
  }, [cancelledBatalRows]);

  const masterLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of barangRows) {
      const mb = r.master_barang;
      const label = mb ? `${mb.kode} — ${mb.nama}` : r.master_barang_id;
      m.set(r.master_barang_id, label);
    }
    return m;
  }, [barangRows]);

  const invToMaster = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of barangRows) {
      for (const line of r.inventaris_lines ?? []) {
        map.set(line.id, r.master_barang_id);
      }
    }
    return map;
  }, [barangRows]);

  const distBarangIdToMaster = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of barangRows) {
      map.set(r.id, r.master_barang_id);
    }
    return map;
  }, [barangRows]);

  function resolveMasterId(ev: EventRow): string | null {
    const p = parseDistributorEventPayload(ev.payload);
    const mid = payloadStr(p.master_barang_id);
    if (mid) return mid;
    const bid = payloadStr(p.distributor_barang_id);
    if (bid) return distBarangIdToMaster.get(bid) ?? null;
    const inv = payloadStr(p.inventaris_id);
    if (inv) return invToMaster.get(inv) ?? null;
    return null;
  }

  function barangLabelFor(ev: EventRow): string {
    const p = parseDistributorEventPayload(ev.payload);
    const mk = payloadStr(p.master_kode);
    const mn = payloadStr(p.master_nama);
    if (mk && mn) return `${mk} — ${mn}`;
    const mid = resolveMasterId(ev);
    if (!mid) return "—";
    const fromApi = masterLabelsExtra[mid];
    if (fromApi?.kode || fromApi?.nama) {
      return `${fromApi.kode || "—"} — ${fromApi.nama || "—"}`;
    }
    if (masterLabel.has(mid)) return masterLabel.get(mid)!;
    return `Master …${mid.slice(0, 8)}`;
  }

  const canKembalikanBarang = useCallback(
    (ev: EventRow): boolean => {
      if (ev.event_type !== "KATALOG_RETUR") return false;
      if (cancelledReturIds.has(ev.id)) return false;
      return canRestoreKatalogRetur(ev.payload);
    },
    [cancelledReturIds],
  );

  const eligibleIds = useMemo(
    () => events.filter(canKembalikanBarang).map((e) => e.id),
    [events, canKembalikanBarang],
  );

  const allEligibleSelected =
    eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));

  const toggleSelectAll = () => {
    if (allEligibleSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(eligibleIds));
  };

  const toggleOne = (id: string) => {
    if (!eligibleIds.includes(id)) return;
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const applyFilters = () => {
    setQApplied(qInput.trim());
    setPage(1);
  };

  const runBatalRetur = async () => {
    const ids = Array.from(selected).filter((id) => eligibleIds.includes(id));
    if (ids.length === 0) return;
    setBatalLoading(true);
    setConfirmOpen(false);
    try {
      const u = `/api/distributor/retur/batal${distQ}`;
      const res = await fetch(u, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_ids: ids }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(
          typeof j?.message === "string"
            ? j.message
            : "Gagal mengembalikan barang ke katalog",
        );
        return;
      }
      const errs = j?.errors as string[] | undefined;
      if (errs?.length) {
        alert(`Selesai dengan catatan:\n${errs.join("\n")}`);
      }
      setSelected(new Set());
      setRefreshTick((t) => t + 1);
    } finally {
      setBatalLoading(false);
    }
  };

  const barangHref =
    adminView && distributorId
      ? `/distributor/barang?distributor_id=${encodeURIComponent(distributorId)}`
      : "/distributor/barang";

  const riwayatHref =
    adminView && distributorId
      ? `/distributor/riwayat?distributor_id=${encodeURIComponent(distributorId)}`
      : "/distributor/riwayat";

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-[#D4AF37]">Batal retur</h1>
        <p className="text-[12px] text-cyan-300/70">
          Pulihkan mapping ke menu{" "}
          <Link
            href={barangHref}
            className="text-cyan-200 underline underline-offset-2"
          >
            Barang
          </Link>{" "}
          dan balikkan stok (jika ada di jejak retur). Centang satu atau beberapa
          baris, lalu konfirmasi. Jejak lengkap peristiwa lain ada di{" "}
          <Link
            href={riwayatHref}
            className="text-cyan-200 underline underline-offset-2"
          >
            Retur
          </Link>
          .
        </p>
        {adminView && !distributorId ? (
          <p className="mt-2 text-[12px] text-amber-300/90">
            Pilih distributor di header untuk membatalkan retur.
          </p>
        ) : null}
        {err ? <p className="mt-1 text-[12px] text-rose-300">{err}</p> : null}
      </div>

      {!(adminView && !distributorId) ? (
        <div className="rounded-2xl border border-amber-500/25 bg-slate-950/50 p-4 space-y-3">
          <div className="text-[12px] font-semibold text-[#D4AF37]">
            Pilih retur yang akan dipulihkan
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-0.5 text-[11px] text-cyan-400/90">
              Cari
              <input
                suppressHydrationWarning
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Nota, petugas, kode…"
                className="w-44 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[12px]"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-[11px] text-cyan-400/90">
              Status retur fisik
              <select
                suppressHydrationWarning
                value={returFisikStatus}
                onChange={(e) => {
                  setReturFisikStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[12px] min-w-[11rem]"
              >
                <option value="">(semua)</option>
                {RETUR_FISIK_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {RETUR_FISIK_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5 text-[11px] text-cyan-400/90">
              Dari
              <input
                suppressHydrationWarning
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[12px]"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-[11px] text-cyan-400/90">
              Sampai
              <input
                suppressHydrationWarning
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[12px]"
              />
            </label>
            <button
              suppressHydrationWarning
              type="button"
              onClick={applyFilters}
              className="px-3 py-1.5 rounded-md text-[12px] bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30"
            >
              Terapkan
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <button
                suppressHydrationWarning
                type="button"
                disabled={selected.size === 0 || batalLoading}
                onClick={() => setConfirmOpen(true)}
                className="px-3 py-1.5 rounded-md text-[12px] border border-amber-500/60 bg-amber-950/40 text-amber-100 disabled:opacity-40"
              >
                {batalLoading
                  ? "Memproses…"
                  : `Kembalikan barang (${selected.size})`}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-cyan-300/65">
            Hanya retur katalog yang belum dibatalkan dan punya data master di
            jejak yang bisa dipilih. Status fisik &amp; nota SJ diubah di halaman{" "}
            <Link href={riwayatHref} className="underline underline-offset-2">
              Retur
            </Link>
            .
          </p>
        </div>
      ) : null}

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal
        >
          <div className="max-w-md w-full rounded-2xl border border-amber-500/30 bg-slate-950 p-4 text-cyan-100 shadow-xl">
            <p className="text-sm font-semibold text-[#D4AF37]">
              Konfirmasi kembalikan barang
            </p>
            <p className="mt-2 text-[12px] text-cyan-300/85">
              {selected.size} retur akan dikembalikan ke menu{" "}
              <strong>Barang</strong> (mapping distributor). Jika ada pencatatan
              stok pada retur, stok akan dibalikkan lewat ledger.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                suppressHydrationWarning
                type="button"
                className="px-3 py-1.5 rounded-md text-[12px] border border-slate-600 text-cyan-200"
                onClick={() => setConfirmOpen(false)}
              >
                Tutup
              </button>
              <button
                suppressHydrationWarning
                type="button"
                className="px-3 py-1.5 rounded-md text-[12px] bg-amber-600/80 text-slate-950 font-medium"
                onClick={() => void runBatalRetur()}
              >
                Ya, lanjutkan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 overflow-hidden">
        <div className="overflow-x-auto max-h-[min(65vh,520px)] overflow-y-auto">
          <table className="min-w-full text-[12px]">
            <thead className="bg-slate-950/90 text-cyan-300/80 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 w-10">
                  <input
                    suppressHydrationWarning
                    type="checkbox"
                    checked={allEligibleSelected}
                    onChange={toggleSelectAll}
                    disabled={eligibleIds.length === 0 || loading}
                    title={
                      eligibleIds.length === 0
                        ? "Tidak ada retur yang bisa dipulihkan di halaman ini"
                        : "Pilih semua yang dapat dipulihkan di halaman ini"
                    }
                    className="accent-amber-500 disabled:opacity-40"
                  />
                </th>
                <th className="px-2 py-2 text-left font-semibold">Waktu</th>
                <th className="px-2 py-2 text-left font-semibold">Nota retur</th>
                <th className="px-2 py-2 text-left font-semibold">Barang</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[9rem]">
                  Status fisik
                </th>
                <th className="px-2 py-2 text-left font-semibold min-w-[7rem]">
                  Nota SJ
                </th>
                <th className="px-2 py-2 text-left font-semibold">Oleh</th>
                <th className="px-2 py-2 text-left font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-cyan-400/70"
                  >
                    Memuat…
                  </td>
                </tr>
              ) : adminView && !distributorId ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-cyan-400/60"
                  >
                    —
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-cyan-400/70"
                  >
                    Tidak ada retur katalog untuk filter ini.
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const eligible = canKembalikanBarang(ev);
                  const cancelled =
                    ev.event_type === "KATALOG_RETUR" &&
                    cancelledReturIds.has(ev.id);
                  const notaUi = notaReturComputed(ev);
                  return (
                    <tr key={ev.id} className="hover:bg-cyan-900/10">
                      <td className="px-2 py-2 align-top">
                        {eligible ? (
                          <input
                            suppressHydrationWarning
                            type="checkbox"
                            checked={selected.has(ev.id)}
                            onChange={() => toggleOne(ev.id)}
                            className="accent-amber-500"
                            aria-label="Pilih retur"
                          />
                        ) : !cancelled ? (
                          <span
                            className="text-cyan-600 cursor-help"
                            title="Tidak bisa dipulihkan: jejak tidak berisi master / snapshot."
                          >
                            —
                          </span>
                        ) : (
                          <span className="text-cyan-700">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-cyan-200/90">
                        {new Date(ev.created_at).toLocaleString("id-ID")}
                      </td>
                      <td
                        className="px-2 py-2 font-mono text-[11px] text-amber-200/90"
                        title={notaUi.title}
                      >
                        {notaUi.text}
                      </td>
                      <td className="px-2 py-2 text-cyan-100 max-w-[200px]">
                        <span className="line-clamp-2">
                          {barangLabelFor(ev)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-cyan-200/90">
                        {cancelled
                          ? "—"
                          : RETUR_FISIK_LABEL[returFisikEffective(ev)]}
                      </td>
                      <td className="px-2 py-2 font-mono text-[11px] text-cyan-300/80 max-w-[120px] truncate">
                        {notaPengirimanDisplay(ev) || "—"}
                      </td>
                      <td className="px-2 py-2 text-cyan-400/90 text-[11px]">
                        {ev.actor ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        {eligible ? (
                          <button
                            suppressHydrationWarning
                            type="button"
                            className="text-[11px] text-amber-300 underline underline-offset-2"
                            onClick={() => {
                              setSelected(new Set([ev.id]));
                              setConfirmOpen(true);
                            }}
                          >
                            Kembalikan barang
                          </button>
                        ) : (
                          <span className="text-cyan-700">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!(adminView && !distributorId) ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-900/60 px-3 py-2 text-[11px] text-cyan-400/80">
            <span>
              Total {total} retur katalog · hal {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                suppressHydrationWarning
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-cyan-800/70 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                suppressHydrationWarning
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded border border-cyan-800/70 disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

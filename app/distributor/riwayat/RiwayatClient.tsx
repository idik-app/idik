"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { parseDistributorEventPayload } from "@/lib/distributorReturSnapshot";
import { DateYmdPicker } from "@/components/ui/date-ymd-picker";
import {
  type BarangRow,
  type EventRow,
  type SummaryData,
  EVENT_LABEL,
  EVENT_TYPES,
  detailLine,
  notaPengirimanDisplay,
  notaReturComputed,
  payloadStr,
  petugasDisplay,
} from "./riwayatShared";

export default function RiwayatClient() {
  const searchParams = useSearchParams();
  const distributorId = (searchParams.get("distributor_id") ?? "").trim();
  const masterFilter = (searchParams.get("master_barang_id") ?? "").trim();

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
  const [eventType, setEventType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [notaDraft, setNotaDraft] = useState<Record<string, string>>({});

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

  useEffect(() => {
    setEventType((searchParams.get("event_type") ?? "").trim());
  }, [searchParams]);

  const distQ =
    distributorId === ""
      ? ""
      : `?distributor_id=${encodeURIComponent(distributorId)}`;

  useEffect(() => {
    if (!distributorId && adminView) return;
    const u = `/api/distributor/events/summary${distQ}`;
    fetch(u, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j.data) setSummary(j.data as SummaryData);
        else setSummary(null);
      })
      .catch(() => setSummary(null));
  }, [distQ, distributorId, adminView, refreshTick]);

  useEffect(() => {
    let alive = true;
    const evQ = new URLSearchParams();
    if (distributorId) evQ.set("distributor_id", distributorId);
    if (masterFilter) {
      evQ.set("limit", "500");
    } else {
      evQ.set("page", String(page));
      evQ.set("page_size", String(pageSize));
      if (qApplied) evQ.set("q", qApplied);
      if (eventType) evQ.set("event_type", eventType);
      if (from) evQ.set("from", from);
      if (to) evQ.set("to", to);
    }

    setLoading(true);
    setErr(null);

    Promise.all([
      fetch(`/api/distributor/events?${evQ.toString()}`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(`/api/distributor/produk${distQ}`, { cache: "no-store" }).then(
        (r) => r.json(),
      ),
    ])
      .then(([evRes, barRes]) => {
        if (!alive) return;
        if (!evRes?.ok) {
          setErr(evRes?.message ?? "Gagal memuat riwayat");
          setEvents([]);
          setMasterLabelsExtra({});
          setTotal(0);
          return;
        }
        setMasterLabelsExtra(
          (evRes.master_labels ?? {}) as Record<
            string,
            { kode: string; nama: string }
          >,
        );
        setTotal(Number(evRes.total ?? (evRes.data ?? []).length));
        let rows = (evRes.data ?? []) as EventRow[];
        if (masterFilter) {
          rows = rows.filter((ev) => {
            const p = parseDistributorEventPayload(ev.payload);
            return String(p.master_barang_id ?? "") === masterFilter;
          });
        }
        setEvents(rows);
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
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [
    distributorId,
    masterFilter,
    page,
    qApplied,
    eventType,
    from,
    to,
    distQ,
    refreshTick,
  ]);

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

  const cancelledReturIds = useMemo(() => {
    const s = new Set<string>();
    for (const ev of events) {
      if (ev.event_type !== "RETUR_DIBATALKAN") continue;
      const oid = payloadStr(
        parseDistributorEventPayload(ev.payload).original_event_id,
      );
      if (oid) s.add(oid);
    }
    return s;
  }, [events]);

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

  const applyFilters = () => {
    setQApplied(qInput.trim());
    setPage(1);
  };

  const patchReturMeta = async (
    eventId: string,
    body: { nota_pengiriman?: string | null },
  ) => {
    if (adminView && !distributorId) return;
    const q =
      distributorId !== ""
        ? `?distributor_id=${encodeURIComponent(distributorId)}`
        : "";
    setPatchingId(eventId);
    try {
      const res = await fetch(`/api/distributor/events/${eventId}${q}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(
          typeof j?.message === "string"
            ? j.message
            : "Gagal menyimpan perubahan",
        );
        return;
      }
      setNotaDraft((d) => {
        const n = { ...d };
        delete n[eventId];
        return n;
      });
      setRefreshTick((t) => t + 1);
    } finally {
      setPatchingId(null);
    }
  };

  const barangHref =
    adminView && distributorId
      ? `/distributor/barang?distributor_id=${encodeURIComponent(distributorId)}`
      : "/distributor/barang";

  const riwayatBase =
    adminView && distributorId
      ? `/distributor/riwayat?distributor_id=${encodeURIComponent(distributorId)}`
      : "/distributor/riwayat";

  const batalReturHref =
    adminView && distributorId
      ? `/distributor/batal-retur?distributor_id=${encodeURIComponent(distributorId)}`
      : "/distributor/batal-retur";

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-[#D4AF37]">Riwayat retur</h1>
        <p className="text-[12px] text-cyan-300/70">
          Peristiwa terkait produk di tabel{" "}
          <Link
            href={barangHref}
            className="text-cyan-200 underline underline-offset-2"
          >
            Barang
          </Link>
          : tambah/ubah, retur katalog, kirim barang, pemakaian FIFO. Untuk retur
          katalog: nomor surat jalan dapat diperbarui di tabel. Untuk{" "}
          <strong className="text-cyan-200/90">membatalkan retur</strong> dan
          mengembalikan barang ke katalog + stok, gunakan panel{" "}
          <Link
            href={batalReturHref}
            className="text-amber-200/90 underline underline-offset-2 font-medium"
          >
            Batal retur
          </Link>
          .
        </p>
        {masterFilter ? (
          <p className="mt-2 text-[12px] text-amber-200/90">
            Filter barang master —{" "}
            <Link href={riwayatBase} className="underline underline-offset-2">
              Tampilkan semua
            </Link>
          </p>
        ) : null}
        {adminView && !distributorId ? (
          <p className="mt-2 text-[12px] text-amber-300/90">
            Pilih distributor di header untuk menampilkan data retur.
          </p>
        ) : null}
        {err ? <p className="mt-1 text-[12px] text-rose-300">{err}</p> : null}
      </div>

      {summary && !(adminView && !distributorId) ? (
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-slate-950/50 p-4 space-y-3">
          <div className="text-[12px] font-semibold text-[#D4AF37]">
            Ringkasan menetap (semua periode)
          </div>
          <p className="text-[11px] text-cyan-300/65">
            Angka di bawah dihitung dari seluruh jejak untuk distributor ini —
            tidak hanya halaman tabel di bawah.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Total peristiwa", v: summary.total_peristiwa },
              { label: "Retur katalog", v: summary.retur_katalog },
              { label: "Batal retur", v: summary.batal_retur },
              {
                label: "Retur belum dibatalkan (kira-kira)",
                v: summary.retur_belum_dibatalkan_kira,
              },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-xl border border-cyan-900/50 bg-slate-950/40 px-3 py-2"
              >
                <div className="text-[10px] text-cyan-500/80">{c.label}</div>
                <div className="text-lg font-semibold text-cyan-100">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!(adminView && !distributorId) ? (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-cyan-900/50 bg-slate-950/40 p-3">
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
            Jenis
            <select
              suppressHydrationWarning
              value={eventType}
              onChange={(e) => {
                setEventType(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[12px] min-w-[10rem]"
            >
              <option value="">Semua</option>
              {EVENT_TYPES.filter(Boolean).map((t) => (
                <option key={t} value={t}>
                  {EVENT_LABEL[t] ?? t}
                </option>
              ))}
            </select>
          </label>
          <DateYmdPicker
            label="Dari"
            value={from}
            onChange={setFrom}
          />
          <DateYmdPicker
            label="Sampai"
            value={to}
            onChange={setTo}
          />
          <button
            suppressHydrationWarning
            type="button"
            onClick={applyFilters}
            className="px-3 py-1.5 rounded-md text-[12px] bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30"
          >
            Terapkan
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 overflow-hidden">
        <div className="overflow-x-auto max-h-[min(65vh,520px)] overflow-y-auto">
          <table className="min-w-full text-[12px]">
            <thead className="bg-slate-950/90 text-cyan-300/80 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 text-left font-semibold">Waktu</th>
                <th className="px-2 py-2 text-left font-semibold">Peristiwa</th>
                <th className="px-2 py-2 text-left font-semibold">
                  Nota retur
                </th>
                <th className="px-2 py-2 text-left font-semibold min-w-[8rem]">
                  Nota pengiriman (SJ)
                </th>
                <th className="px-2 py-2 text-left font-semibold">Barang</th>
                <th className="px-2 py-2 text-left font-semibold">Rincian</th>
                <th className="px-2 py-2 text-left font-semibold">Oleh</th>
                <th className="px-2 py-2 text-left font-semibold">
                  Penerima (petugas)
                </th>
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
                    Tidak ada data untuk filter ini.
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const mid = resolveMasterId(ev);
                  const barangLink =
                    mid && !masterFilter
                      ? `${riwayatBase}${riwayatBase.includes("?") ? "&" : "?"}master_barang_id=${encodeURIComponent(mid)}`
                      : null;
                  const cancelled =
                    ev.event_type === "KATALOG_RETUR" &&
                    cancelledReturIds.has(ev.id);
                  const notaUi = notaReturComputed(ev);
                  return (
                    <tr key={ev.id} className="hover:bg-cyan-900/10">
                      <td className="px-2 py-2 whitespace-nowrap text-cyan-200/90">
                        {new Date(ev.created_at).toLocaleString("id-ID")}
                      </td>
                      <td className="px-2 py-2 text-cyan-100">
                        {EVENT_LABEL[ev.event_type] ?? ev.event_type}
                        {cancelled ? (
                          <span className="ml-1 text-[10px] text-amber-400/90">
                            (dibatalkan)
                          </span>
                        ) : null}
                      </td>
                      <td
                        className="px-2 py-2 font-mono text-[11px] text-amber-200/90"
                        title={notaUi.title}
                      >
                        {notaUi.text}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {ev.event_type === "KATALOG_RETUR" && !cancelled ? (
                          <div className="flex flex-col gap-1 max-w-[11rem]">
                            <input
                              suppressHydrationWarning
                              className="bg-slate-950/80 border border-cyan-800/60 rounded px-1 py-1 text-[11px] font-mono"
                              value={
                                notaDraft[ev.id] ?? notaPengirimanDisplay(ev)
                              }
                              onChange={(e) =>
                                setNotaDraft((d) => ({
                                  ...d,
                                  [ev.id]: e.target.value,
                                }))
                              }
                              placeholder="No. SJ / ref."
                              disabled={
                                patchingId === ev.id ||
                                (adminView && !distributorId)
                              }
                            />
                            <button
                              suppressHydrationWarning
                              type="button"
                              className="text-left text-[10px] text-amber-300/90 underline disabled:opacity-40"
                              disabled={
                                patchingId === ev.id ||
                                (adminView && !distributorId)
                              }
                              onClick={() => {
                                const raw = (
                                  notaDraft[ev.id] ?? notaPengirimanDisplay(ev)
                                ).trim();
                                void patchReturMeta(ev.id, {
                                  nota_pengiriman: raw || null,
                                });
                              }}
                            >
                              Simpan nota
                            </button>
                          </div>
                        ) : (
                          <span className="text-cyan-600">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-cyan-100 max-w-[200px]">
                        <span className="line-clamp-2">
                          {barangLabelFor(ev)}
                        </span>
                        {barangLink ? (
                          <Link
                            href={barangLink}
                            className="mt-0.5 inline-block text-[10px] text-amber-300/90 underline underline-offset-2"
                          >
                            Filter barang ini
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-cyan-300/80 max-w-[220px]">
                        <span className="line-clamp-3">
                          {detailLine(
                            ev.event_type,
                            parseDistributorEventPayload(ev.payload),
                          ) || "—"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-cyan-400/90 text-[11px]">
                        {ev.actor ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-cyan-400/85 text-[11px] max-w-[120px]">
                        {petugasDisplay(ev)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!masterFilter && !(adminView && !distributorId) ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-900/60 px-3 py-2 text-[11px] text-cyan-400/80">
            <span>
              Total {total} peristiwa · hal {page} / {totalPages}
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

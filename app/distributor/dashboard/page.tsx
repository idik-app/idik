"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

function isoDateLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sumJumlah(rows: { jumlah?: number | null }[]) {
  return rows.reduce((acc, r) => acc + Number(r.jumlah ?? 0), 0);
}

type KpiState = {
  loading: boolean;
  today: number | null;
  week: number | null;
  alerts: number | null;
  barang: number | null;
  error?: string;
};

type FlowState = {
  loading: boolean;
  qty_masuk: number | null;
  qty_keluar_retur_rusak: number | null;
  qty_koreksi_net: number | null;
  skippedAdminAll?: boolean;
  error?: string;
};

type EventRow = {
  id: string;
  created_at: string;
  event_type: string;
  actor: string | null;
};

const EVENT_LABEL: Record<string, string> = {
  PRODUCT_UPSERT: "Produk (katalog)",
  PRODUCT_UPDATED: "Produk diubah",
  PRODUCT_DELETED: "Mapping dihapus",
  KATALOG_RETUR: "Retur katalog",
  MUTASI_STOK: "Kirim barang",
  PEMAKAIAN_FIFO: "Pemakaian FIFO",
};

function DistributorDashboardPageContent() {
  const searchParams = useSearchParams();
  const distributorId = (searchParams.get("distributor_id") ?? "").trim();

  const [kpi, setKpi] = useState<KpiState>({
    loading: true,
    today: null,
    week: null,
    alerts: null,
    barang: null,
  });
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsErr, setEventsErr] = useState<string | undefined>();
  const [flow, setFlow] = useState<FlowState>({
    loading: true,
    qty_masuk: null,
    qty_keluar_retur_rusak: null,
    qty_koreksi_net: null,
  });

  const distPath = useMemo(() => {
    if (!distributorId) return "";
    return `?distributor_id=${encodeURIComponent(distributorId)}`;
  }, [distributorId]);

  const { todayStr, weekFromStr } = useMemo(() => {
    const now = new Date();
    const start7 = new Date(now);
    start7.setDate(start7.getDate() - 6);
    return { todayStr: isoDateLocal(now), weekFromStr: isoDateLocal(start7) };
  }, []);

  useEffect(() => {
    let alive = true;
    const distSuffix =
      distributorId === ""
        ? ""
        : `&distributor_id=${encodeURIComponent(distributorId)}`;
    const distQuery =
      distributorId === ""
        ? ""
        : `distributor_id=${encodeURIComponent(distributorId)}`;

    const pemakaianUrl = (from: string, to: string) =>
      `/api/distributor/pemakaian?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${distSuffix}`;

    setKpi((s) => ({ ...s, loading: true, error: undefined }));
    setEventsLoading(true);
    setEventsErr(undefined);

    const eventsUrl = `/api/distributor/events?limit=8${distSuffix}`;

    const mutasiSummaryUrl = `/api/distributor/mutasi/summary?from=${encodeURIComponent(weekFromStr)}&to=${encodeURIComponent(todayStr)}${distSuffix}`;

    setFlow((s) => ({ ...s, loading: true, error: undefined, skippedAdminAll: false }));

    Promise.all([
      fetch(pemakaianUrl(todayStr, todayStr), { cache: "no-store" }).then((r) =>
        r.json()
      ),
      fetch(pemakaianUrl(weekFromStr, todayStr), { cache: "no-store" }).then(
        (r) => r.json()
      ),
      fetch(
        `/api/distributor/stok-menipis${distQuery ? `?${distQuery}` : ""}`,
        { cache: "no-store" }
      ).then((r) => r.json()),
      fetch(`/api/distributor/barang${distQuery ? `?${distQuery}` : ""}`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(eventsUrl, { cache: "no-store" }).then((r) => r.json()),
      fetch(mutasiSummaryUrl, { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([todayRes, weekRes, stokRes, barangRes, evRes, mutasiRes]) => {
        if (!alive) return;
        if (!todayRes?.ok || !weekRes?.ok || !stokRes?.ok || !barangRes?.ok) {
          setKpi({
            loading: false,
            today: null,
            week: null,
            alerts: null,
            barang: null,
            error: "Gagal memuat ringkasan",
          });
          setEventsLoading(false);
          setEvents([]);
          setFlow({
            loading: false,
            qty_masuk: null,
            qty_keluar_retur_rusak: null,
            qty_koreksi_net: null,
            error: "Gagal memuat ringkasan mutasi",
          });
          return;
        }
        const alerts =
          typeof stokRes.summary?.total_menipis === "number"
            ? stokRes.summary.total_menipis
            : Array.isArray(stokRes.data)
              ? stokRes.data.length
              : 0;
        const barang = Array.isArray(barangRes.data) ? barangRes.data.length : 0;
        setKpi({
          loading: false,
          today: sumJumlah(todayRes.data ?? []),
          week: sumJumlah(weekRes.data ?? []),
          alerts,
          barang,
        });
        setEventsLoading(false);
        if (mutasiRes?.ok && mutasiRes.data) {
          const d = mutasiRes.data as {
            qty_masuk?: number;
            qty_keluar_retur_rusak?: number;
            qty_koreksi_net?: number;
          };
          setFlow({
            loading: false,
            qty_masuk: Number(d.qty_masuk ?? 0),
            qty_keluar_retur_rusak: Number(d.qty_keluar_retur_rusak ?? 0),
            qty_koreksi_net: Number(d.qty_koreksi_net ?? 0),
          });
        } else {
          const msg =
            typeof mutasiRes?.message === "string" ? mutasiRes.message : "";
          const adminNeedDist =
            msg.includes("Admin") && msg.includes("distributor_id");
          setFlow({
            loading: false,
            qty_masuk: null,
            qty_keluar_retur_rusak: null,
            qty_koreksi_net: null,
            skippedAdminAll: adminNeedDist,
            error: adminNeedDist
              ? undefined
              : msg || "Gagal memuat ringkasan mutasi",
          });
        }
        if (evRes?.ok && Array.isArray(evRes.data)) {
          setEvents(evRes.data);
          setEventsErr(undefined);
        } else {
          setEvents([]);
          setEventsErr(
            typeof evRes?.message === "string"
              ? evRes.message
              : "Gagal memuat aktivitas",
          );
        }
      })
      .catch(() => {
        if (!alive) return;
        setKpi({
          loading: false,
          today: null,
          week: null,
          alerts: null,
          barang: null,
          error: "Gagal memuat ringkasan",
        });
        setEventsLoading(false);
        setEvents([]);
        setFlow({
          loading: false,
          qty_masuk: null,
          qty_keluar_retur_rusak: null,
          qty_koreksi_net: null,
          error: "Gagal memuat ringkasan mutasi",
        });
      });

    return () => {
      alive = false;
    };
  }, [todayStr, weekFromStr, distributorId]);

  const fmt = (n: number | null) => {
    if (kpi.loading) return "…";
    if (n === null) return "—";
    return String(n);
  };

  const fmtFlow = (n: number | null) => {
    if (flow.loading) return "…";
    if (n === null) return "—";
    return String(n);
  };

  const quickLinks: { href: string; label: string }[] = [
    { href: `/distributor/barang${distPath}`, label: "Barang" },
    { href: `/distributor/panel-retur${distPath}`, label: "Panel retur" },
    { href: `/distributor/stok-menipis${distPath}`, label: "Stok menipis" },
    { href: `/distributor/pemakaian${distPath}`, label: "Pemakaian" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-[#D4AF37]">
          Dashboard • Cathlab
        </h1>
        <p className="text-[12px] text-cyan-300/70">
          Ringkasan pemakaian, kirim barang Cathlab, dan alert untuk distributor.
          {distributorId ? (
            <span className="ml-1 text-cyan-400/90">
              (filter distributor aktif)
            </span>
          ) : null}
        </p>
        {kpi.error ? (
          <p className="mt-1 text-[11px] text-amber-400/90">{kpi.error}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          {
            label: "Pemakaian Hari Ini (qty)",
            value: fmt(kpi.today),
          },
          {
            label: "Pemakaian 7 Hari (qty)",
            value: fmt(kpi.week),
          },
          {
            label: "Alert Stok Menipis",
            value: fmt(kpi.alerts),
          },
          {
            label: "Barang Aktif (SKU)",
            value: fmt(kpi.barang),
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-4"
          >
            <div className="text-[11px] text-cyan-300/70">{c.label}</div>
            <div className="text-2xl font-bold text-cyan-100">{c.value}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[11px] font-medium text-cyan-300/80 mb-2">
          Aliran stok Cathlab (7 hari, dari kirim barang)
        </div>
        <p className="text-[10px] text-cyan-300/50 mb-2">
          {
            "Masuk / keluar retur & rusak mengikuti waktu catat di sistem. Koreksi bisa plus atau minus. Pemakaian klinis tetap di KPI di atas."
          }
        </p>
        {flow.skippedAdminAll ? (
          <p className="text-[11px] text-cyan-300/65 mb-2">
            Administrator: pilih distributor di header untuk melihat ringkasan
            mutasi per PT.
          </p>
        ) : null}
        {flow.error ? (
          <p className="text-[11px] text-amber-400/90 mb-2">{flow.error}</p>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-4">
            <div className="text-[11px] text-cyan-300/70">
              Qty masuk (pengiriman ke Cathlab)
            </div>
            <div className="text-2xl font-bold text-cyan-100">
              {fmtFlow(flow.qty_masuk)}
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-4">
            <div className="text-[11px] text-cyan-300/70">
              {"Qty keluar retur & rusak"}
            </div>
            <div className="text-2xl font-bold text-cyan-100">
              {fmtFlow(flow.qty_keluar_retur_rusak)}
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-4">
            <div className="text-[11px] text-cyan-300/70">Koreksi stok (net)</div>
            <div className="text-2xl font-bold text-cyan-100">
              {fmtFlow(flow.qty_koreksi_net)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-900/50 bg-slate-950/25 p-3">
        <div className="text-[11px] font-medium text-cyan-300/80 mb-2">
          Menu cepat
        </div>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="inline-flex items-center rounded-lg border border-cyan-800/60 bg-slate-950/50 px-3 py-1.5 text-[11px] text-cyan-200/90 hover:bg-slate-900/70 hover:border-cyan-600/60 transition-colors"
            >
              {q.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-4">
          <div className="text-[12px] font-semibold text-cyan-100">
            Aktivitas terbaru
          </div>
          <p className="mt-1 text-[11px] text-cyan-300/60">
            Katalog, kirim barang, dan pemakaian FIFO yang tercatat untuk akun
            ini.
          </p>
          {eventsErr ? (
            <p className="mt-2 text-[11px] text-amber-400/90">{eventsErr}</p>
          ) : eventsLoading ? (
            <div className="mt-3 text-[12px] text-cyan-300/70">Memuat…</div>
          ) : events.length === 0 ? (
            <div className="mt-3 text-[12px] text-cyan-300/70">
              Belum ada peristiwa tercatat.
            </div>
          ) : (
            <ul className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {events.map((e) => {
                const t = new Date(e.created_at);
                const timeOk = !Number.isNaN(t.getTime());
                return (
                  <li
                    key={e.id}
                    className="rounded-lg border border-cyan-900/40 bg-slate-950/30 px-2 py-1.5 text-[11px]"
                  >
                    <div className="flex justify-between gap-2 text-cyan-100">
                      <span>
                        {EVENT_LABEL[e.event_type] ?? e.event_type}
                      </span>
                      <span className="shrink-0 text-cyan-300/60 tabular-nums">
                        {timeOk
                          ? t.toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </span>
                    </div>
                    {e.actor ? (
                      <div className="mt-0.5 text-cyan-300/55">
                        oleh {e.actor}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-4">
          <div className="text-[12px] font-semibold text-cyan-100">
            Stok menipis
          </div>
          <div className="mt-2 text-[12px] text-cyan-300/70">
            {kpi.loading
              ? "Memuat…"
              : kpi.alerts === null
                ? "Tidak dapat memuat alert."
                : kpi.alerts === 0
                  ? "Tidak ada item di bawah ambang stok untuk filter ini."
                  : `${kpi.alerts} item perlu perhatian — lihat menu Stok Menipis untuk rincian.`}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DistributorDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-cyan-500/80 text-sm">
          Memuat dashboard…
        </div>
      }
    >
      <DistributorDashboardPageContent />
    </Suspense>
  );
}

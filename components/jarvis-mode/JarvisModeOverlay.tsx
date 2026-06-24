"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  motion,
} from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Stethoscope,
  Syringe,
  Users,
} from "lucide-react";

import { useJarvisModeOptional } from "@/contexts/JarvisModeContext";
import {
  computeCriticalAlerts,
  computeDailyMatrix,
  computeMonthlyMatrix,
  computeWeeklyMatrix,
} from "@/lib/jarvis-mode/computeJarvisModeData";
import { emptyTindakanKpiStats } from "@/app/dashboard/layanan/tindakan/hooks/useTindakanStats";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";
import { cn } from "@/lib/utils";

import JarvisModeCloseButton from "./JarvisModeCloseButton";
import JarvisModeMatrixPanel from "./JarvisModeMatrixPanel";
import JarvisModeStatCard from "./JarvisModeStatCard";
import JarvisModeSystemBar from "./JarvisModeSystemBar";

export default function JarvisModeOverlay() {
  const ctx = useJarvisModeOptional();
  const [mounted, setMounted] = useState(false);
  const isActive = ctx?.isActive ?? false;
  const data = ctx?.data;
  const exit = ctx?.exit;
  const locationLabel = ctx?.locationLabel ?? "";
  const autoSleepRemainingMs = ctx?.autoSleepRemainingMs ?? 0;
  const autoSleepMs = ctx?.autoSleepMs ?? 180_000;

  const rows = data?.allRows ?? data?.filtered?.allRows ?? [];
  const stats = data?.stats ?? emptyTindakanKpiStats();
  const loading = Boolean(data?.loading);

  const dailyMatrix = useMemo(() => computeDailyMatrix(rows), [rows]);
  const weeklyMatrix = useMemo(() => computeWeeklyMatrix(rows), [rows]);
  const monthlyMatrix = useMemo(() => computeMonthlyMatrix(rows), [rows]);
  const criticalAlerts = useMemo(() => computeCriticalAlerts(rows), [rows]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isActive || !exit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        exit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, exit]);

  useEffect(() => {
    if (!isActive || !ctx?.setData) return;
    if (rows.length > 0) return;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/cathlab/tindakan-hari-ini", {
          credentials: "include",
        });
        const json = await res.json();
        if (cancelled || !json?.ok) return;
        const apiRows = Array.isArray(json.rows) ? json.rows : [];
        ctx.setData({
          stats: {
            "Pasien hari ini": apiRows.length,
            "Total pasien": apiRows.length,
            "Total tindakan": new Set(
              apiRows.map((r: { tindakan?: string }) =>
                String(r.tindakan ?? "").trim(),
              ),
            ).size,
            "Total dokter": new Set(
              apiRows.map((r: { dokter?: string }) =>
                String(r.dokter ?? "").trim(),
              ),
            ).size,
          },
          allRows: apiRows,
          loading: false,
        });
      } catch {
        /* degradasi halus */
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isActive, rows.length, ctx?.setData]);

  useEffect(() => {
    if (!isActive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isActive]);

  if (!ctx || !mounted) return null;

  const totalPasien = stats["Total pasien"] ?? stats["Pasien hari ini"] ?? 0;
  const totalTindakan = stats["Total tindakan"] ?? 0;
  const totalDokter = stats["Total dokter"] ?? 0;
  const ppciWeekly = stats["PPCI Minggu Ini"] ?? 0;
  const laporanMapped = stats["Laporan Terpetakan"] ?? 0;

  const overlay = (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {isActive ? (
          <motion.div
            key="jarvis-mode-overlay"
            className={cn(
              "fixed inset-0 flex flex-col isolate pointer-events-auto",
              UI_LAYERS.jarvisMode,
              "bg-black/80 backdrop-blur-2xl",
            )}
            style={{ zIndex: Z_INDEX_VALUES.jarvisMode }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.45, 0, 0.55, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="JARVIS Mode Dashboard"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-1/4 top-0 h-[50vh] w-[50vw] rounded-full bg-cyan-500/10 blur-[120px]" />
              <div className="absolute -right-1/4 bottom-0 h-[40vh] w-[45vw] rounded-full bg-amber-500/8 blur-[100px]" />
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col p-4 sm:p-6 lg:p-8">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <motion.p
                    className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300/90"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    JARVIS Mode
                  </motion.p>
                  <motion.h1
                    className="mt-1 text-xl font-semibold text-white sm:text-2xl lg:text-3xl"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    {locationLabel}
                  </motion.h1>
                  <p className="mt-1 text-xs text-white/75 dark:text-white/90">
                    Ambient display · aktif saat idle 10 detik
                  </p>
                </div>
                <JarvisModeCloseButton
                  onClose={() => exit?.()}
                  autoSleepRemainingMs={autoSleepRemainingMs}
                  autoSleepMs={autoSleepMs}
                />
              </header>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-2 xl:grid-cols-4">
                  <JarvisModeStatCard
                    label="Total Pasien"
                    value={totalPasien}
                    icon={Users}
                    variant="admin"
                    loading={loading}
                  />
                  <JarvisModeStatCard
                    label="Total Tindakan"
                    value={totalTindakan}
                    icon={Syringe}
                    variant="admin"
                    sublines={data?.filtered?.tindakanBreakdown}
                    loading={loading}
                  />
                  <JarvisModeStatCard
                    label="Dokter Aktif"
                    value={totalDokter}
                    icon={Stethoscope}
                    variant="neutral"
                    sublines={data?.filtered?.dokterBreakdown}
                    loading={loading}
                  />
                  <JarvisModeStatCard
                    label="Laporan PPCI"
                    value={ppciWeekly}
                    icon={Activity}
                    variant="ppci"
                    sublines={data?.filtered?.ppciDokterBreakdown}
                    loading={loading}
                  />
                </div>

                <div className="lg:col-span-4">
                  <section
                    className={cn(
                      "jarvis-glass h-full rounded-2xl border p-4 backdrop-blur-xl sm:p-5",
                      criticalAlerts.length > 0
                        ? "border-rose-400/40 bg-rose-950/25"
                        : "border-emerald-400/30 bg-black/35",
                    )}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle
                        className={cn(
                          "h-4 w-4",
                          criticalAlerts.length > 0
                            ? "text-rose-300"
                            : "text-emerald-300",
                        )}
                        aria-hidden
                      />
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white dark:text-white">
                        Peringatan Medis
                      </h3>
                    </div>
                    {criticalAlerts.length === 0 ? (
                      <p className="text-sm text-white/80 dark:text-white/90">
                        Tidak ada status kritis atau PPCI aktif hari ini.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {criticalAlerts.map((alert) => (
                          <li
                            key={alert.id}
                            className={cn(
                              "rounded-lg border px-3 py-2",
                              alert.severity === "kritis" &&
                                "border-rose-400/45 bg-rose-500/10",
                              alert.severity === "ppci" &&
                                "border-amber-400/45 bg-amber-500/10",
                              alert.severity === "warning" &&
                                "border-white/15 bg-black/30",
                            )}
                          >
                            <p
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-wide",
                                alert.severity === "kritis" && "text-rose-200",
                                alert.severity === "ppci" && "text-amber-200",
                                alert.severity === "warning" &&
                                  "text-white/85",
                              )}
                            >
                              {alert.label}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-white dark:text-white">
                              {alert.detail}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>

                <div className="lg:col-span-7">
                  <JarvisModeMatrixPanel
                    daily={dailyMatrix}
                    weekly={weeklyMatrix}
                    monthly={monthlyMatrix}
                  />
                </div>

                <div className="lg:col-span-5">
                  <section className="jarvis-glass flex h-full min-h-[220px] flex-col rounded-2xl border border-cyan-400/25 bg-black/35 p-4 backdrop-blur-xl sm:p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <ClipboardList
                        className="h-4 w-4 text-cyan-300"
                        aria-hidden
                      />
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white dark:text-white">
                        Laporan Terpetakan
                      </h3>
                    </div>
                    <p className="font-mono text-4xl font-bold tabular-nums text-cyan-50">
                      {loading ? "—" : laporanMapped}
                    </p>
                    <p className="mt-2 text-xs text-white/75 dark:text-white/90">
                      Dokumen PCI terhubung Google Sheets / Drive
                    </p>
                    {data?.filtered?.gender ? (
                      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                        <div className="rounded-lg border border-white/10 bg-black/25 p-2 text-center">
                          <p className="text-[10px] uppercase text-white/70">
                            Laki-laki
                          </p>
                          <p className="font-mono text-xl font-bold text-white">
                            {data.filtered.gender.laki}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/25 p-2 text-center">
                          <p className="text-[10px] uppercase text-white/70">
                            Perempuan
                          </p>
                          <p className="font-mono text-xl font-bold text-white">
                            {data.filtered.gender.perempuan}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </section>
                </div>
              </div>

              <div className="mt-4 shrink-0">
                <JarvisModeSystemBar lastSyncAt={data?.lastSyncAt} />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );

  return createPortal(overlay, document.body);
}

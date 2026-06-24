"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, LazyMotion, domAnimation } from "framer-motion";

import { useJarvisModeOptional } from "@/contexts/JarvisModeContext";
import { emptyTindakanKpiStats } from "@/app/dashboard/layanan/tindakan/hooks/useTindakanStats";
import { resetJarvisWidgetLayout } from "@/lib/jarvis-mode/dashboardLayout";
import { Z_INDEX_VALUES } from "@/lib/ui/layers";
import { cn } from "@/lib/utils";

import JarvisModeCloseButton from "./JarvisModeCloseButton";
import JarvisModeConsoleShell from "./JarvisModeConsoleShell";
import JarvisModeDraggableCanvas from "./JarvisModeDraggableCanvas";
import JarvisModeSystemBar from "./JarvisModeSystemBar";

function useLiveClock(active: boolean) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [active]);

  return useMemo(() => {
    const date = now.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
    const time = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
    return { date, time };
  }, [now]);
}

export default function JarvisModeOverlay() {
  const ctx = useJarvisModeOptional();
  const [mounted, setMounted] = useState(false);
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  const isActive = ctx?.isActive ?? false;
  const data = ctx?.data;
  const exit = ctx?.exit;
  const locationLabel = ctx?.locationLabel ?? "";
  const autoSleepRemainingMs = ctx?.autoSleepRemainingMs ?? 0;
  const autoSleepMs = ctx?.autoSleepMs ?? 180_000;

  const rows = data?.allRows ?? data?.filtered?.allRows ?? [];
  const stats = data?.stats ?? emptyTindakanKpiStats();
  const loading = Boolean(data?.loading);
  const clock = useLiveClock(isActive);

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

  if (!ctx || !mounted) return null;

  const overlay = (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {isActive ? (
          <div
            key="jarvis-mode-layer"
            className="pointer-events-none fixed inset-0"
            style={{ zIndex: Z_INDEX_VALUES.jarvisMode }}
            aria-hidden={false}
          >
            <JarvisModeConsoleShell
              isActive={isActive}
              header={
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                      JARVIS
                    </p>
                    <p className="truncate text-[9px] text-white/80 dark:text-white/90">
                      {locationLabel}
                    </p>
                  </div>
                  <p className="hidden shrink-0 text-right font-mono text-[9px] tabular-nums text-cyan-200/90 sm:block">
                    <span className="block text-white/60">{clock.date}</span>
                    <span className="text-[11px] font-semibold text-cyan-200">
                      {clock.time}
                    </span>
                  </p>
                </div>
              }
              headerActions={
                <>
                  <button
                    type="button"
                    onClick={() => {
                      resetJarvisWidgetLayout();
                      setLayoutEpoch((n) => n + 1);
                    }}
                    className={cn(
                      "rounded border border-white/15 px-1.5 py-1 text-[8px] font-bold uppercase tracking-wide",
                      "text-white/75 transition hover:border-cyan-400/40 hover:text-white",
                    )}
                    title="Reset tata letak widget"
                  >
                    Reset
                  </button>
                  <div className="pointer-events-auto pl-0.5">
                    <JarvisModeCloseButton
                      onClose={() => exit?.()}
                      autoSleepRemainingMs={autoSleepRemainingMs}
                      autoSleepMs={autoSleepMs}
                      compact
                    />
                  </div>
                </>
              }
              footer={
                <div className="pointer-events-auto">
                  <JarvisModeSystemBar lastSyncAt={data?.lastSyncAt} compact />
                </div>
              }
            >
              <div className="pointer-events-auto h-full min-h-0">
                <JarvisModeDraggableCanvas
                  key={layoutEpoch}
                  rows={rows}
                  stats={stats}
                  filtered={data?.filtered}
                  pasienOptions={data?.pasienOptions}
                  loading={loading}
                  compact
                />
              </div>
            </JarvisModeConsoleShell>
          </div>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );

  return createPortal(overlay, document.body);
}

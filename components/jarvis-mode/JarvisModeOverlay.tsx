"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, LazyMotion, domAnimation, motion } from "framer-motion";

import { useJarvisModeOptional } from "@/contexts/JarvisModeContext";
import { emptyTindakanKpiStats } from "@/app/dashboard/layanan/tindakan/hooks/useTindakanStats";
import { Z_INDEX_VALUES } from "@/lib/ui/layers";

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
      weekday: "long",
      day: "numeric",
      month: "long",
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

const STATUS_LINES = [
  "MONITORING CATH LAB — STANDBY",
  "LIVE SYNC GOOGLE SHEETS / SUPABASE",
  "SATUSEHAT FHIR — CHANNEL ACTIVE",
] as const;

export default function JarvisModeOverlay() {
  const ctx = useJarvisModeOptional();
  const [mounted, setMounted] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
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
    if (!isActive) return;
    const id = window.setInterval(
      () => setStatusIdx((i) => (i + 1) % STATUS_LINES.length),
      4000,
    );
    return () => clearInterval(id);
  }, [isActive]);

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
                <div className="flex flex-wrap items-start justify-between gap-2 pr-1">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-cyan-300/90">
                      JARVIS Mode
                    </p>
                    <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-white sm:text-base">
                      Intel · Standby Status
                    </h2>
                    <p className="mt-0.5 truncate text-[10px] text-white/75 dark:text-white/90">
                      {locationLabel}
                    </p>
                    <motion.p
                      key={statusIdx}
                      className="mt-1 font-mono text-[9px] uppercase tracking-wider text-cyan-400/90"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      ▸ {STATUS_LINES[statusIdx]}
                    </motion.p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-[9px] capitalize text-white/70">{clock.date}</p>
                    <p className="font-mono text-sm font-semibold tabular-nums text-cyan-200">
                      {clock.time}
                    </p>
                  </div>
                  <div className="pointer-events-auto">
                    <JarvisModeCloseButton
                      onClose={() => exit?.()}
                      autoSleepRemainingMs={autoSleepRemainingMs}
                      autoSleepMs={autoSleepMs}
                    />
                  </div>
                </div>
              }
              footer={
                <div className="pointer-events-auto">
                  <JarvisModeSystemBar lastSyncAt={data?.lastSyncAt} />
                </div>
              }
            >
              <div className="pointer-events-auto">
                <JarvisModeDraggableCanvas
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

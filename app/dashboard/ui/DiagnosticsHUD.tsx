"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEventBridge } from "@/contexts/EventBridgeContext";
import { useDiagnosticsHUD } from "@/contexts/DiagnosticsHUDContext";
import { useDiagnosticsBridge } from "@/core/idik-autonomous/DiagnosticsBridge";
import { JARVIS } from "@/lib/copy/jarvis";
import {
  Cpu,
  Activity,
  ShieldAlert,
  DatabaseZap,
  List,
  Trash2,
  ChevronDown,
  ChevronUp,
  Minus,
  Maximize2,
} from "lucide-react";

const MAX_EVENTS_VISIBLE = 8;
/** Panel penuh otomatis minimize jika pointer tidak di atas HUD selama ini (ms). */
const AUTO_COLLAPSE_MS = 12_000;

export default function DiagnosticsHUD() {
  const { events, clearEvents } = useDiagnosticsHUD();
  const { subscribe, emit } = useEventBridge();
  const { supabaseStatus, realtimeEvents: bridgeEvents } = useDiagnosticsBridge();
  const [meta, setMeta] = useState({
    events: 0,
    anomalies: 0,
    cpu: 0,
    stable: true,
  });
  const [showLog, setShowLog] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoCollapse = useCallback(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const armAutoCollapse = useCallback(() => {
    clearAutoCollapse();
    collapseTimerRef.current = setTimeout(() => setMinimized(true), AUTO_COLLAPSE_MS);
  }, [clearAutoCollapse]);

  useEffect(() => {
    if (minimized) {
      clearAutoCollapse();
      return;
    }
    armAutoCollapse();
    return () => clearAutoCollapse();
  }, [minimized, armAutoCollapse, clearAutoCollapse]);

  // Emit kernel:update saat jumlah event berubah; subscriber di bawah akan update meta
  useEffect(() => {
    emit("kernel:update", {
      events: events.length,
      anomalies: meta.anomalies,
      cpu: meta.cpu,
      stable: meta.stable,
    });
  }, [events.length, emit]);

  // Subscribe ke kernel:update (dari emit kita sendiri atau kernel lain)
  useEffect(() => {
    const unsub = subscribe("kernel:update", (data: Record<string, unknown>) => {
      setMeta((prev) => ({
        ...prev,
        events: (data.events as number) ?? prev.events,
        anomalies: (data.anomalies as number) ?? prev.anomalies,
        cpu: (data.cpu as number) ?? prev.cpu,
        stable: (data.stable as boolean) ?? prev.stable,
      }));
    });
    return () => unsub();
  }, [subscribe]);

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed z-[55] flex max-w-[calc(100vw-1.25rem)] items-center gap-1.5 rounded-full border border-cyan-500/50 bg-black/70 px-2.5 py-1.5 text-[10px] text-cyan-200 shadow-[0_0_12px_rgba(0,255,255,0.4)] hover:border-cyan-300/80 sm:gap-2 sm:px-3 sm:text-[11px] max-md:bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] max-md:right-3 md:bottom-4 md:right-4"
      >
        <Cpu size={14} className="text-cyan-300" />
        <span className="font-semibold">{JARVIS.hud.kernelTitle}</span>
        <span className="text-xs text-cyan-400">({events.length})</span>
        <Maximize2 size={12} className="ml-1" />
      </button>
    );
  }

  return (
    <div
      className="
      fixed z-[55] flex flex-col gap-2
      max-md:inset-x-3 max-md:bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] max-md:w-auto
      md:inset-x-auto md:bottom-4 md:right-4 md:left-auto md:w-72
      bg-black/60 backdrop-blur-xl 
      border border-cyan-500/40 
      rounded-xl p-2.5 sm:p-3 text-xs text-cyan-200
      shadow-[0_0_15px_rgba(0,255,255,0.4)]
      max-h-[min(80vh,32rem)] md:max-h-[80vh]
    "
      onPointerEnter={clearAutoCollapse}
      onPointerLeave={armAutoCollapse}
    >
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="font-bold text-cyan-300 tracking-wide flex items-center gap-2">
          <Cpu size={14} /> {JARVIS.hud.kernelTitle}
        </div>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-cyan-500/60 bg-black/60 text-cyan-200 hover:border-cyan-300/80"
          aria-label="Minimize HUD"
        >
          <Minus size={12} />
        </button>
      </div>

      <Row
        icon={<DatabaseZap size={14} />}
        label="Koneksi"
        value={
          supabaseStatus === "connected"
            ? JARVIS.connection.connected
            : supabaseStatus === "disconnected"
            ? JARVIS.connection.disconnected
            : JARVIS.connection.idle
        }
      />
      <Row
        icon={<Activity size={14} />}
        label={JARVIS.hud.realtimeEvents}
        value={bridgeEvents + meta.events}
      />
      <Row
        icon={<ShieldAlert size={14} />}
        label={JARVIS.hud.integrity}
        value={meta.stable ? JARVIS.hud.stable : JARVIS.hud.recoveryMode}
      />

      {!meta.stable && (
        <div className="text-red-400 text-[11px] shrink-0">
          Kernel mendeteksi anomali — rollback guard aktif.
        </div>
      )}

      {/* Log event dari DiagnosticsHUDContext */}
      <div className="border-t border-cyan-500/30 pt-2 mt-1 shrink-0">
        <button
          type="button"
          onClick={() => setShowLog((v) => !v)}
          className="flex items-center justify-between w-full text-cyan-300/90 hover:text-cyan-200"
        >
          <span className="flex items-center gap-1.5">
            <List size={12} /> Log ({events.length})
          </span>
          {showLog ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
        {showLog && (
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-cyan-500/70 text-[10px]">{JARVIS.hud.logEmpty}</div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={clearEvents}
                  className="flex items-center gap-1 text-amber-400/80 hover:text-amber-300 text-[10px]"
                >
                  <Trash2 size={10} /> {JARVIS.hud.clearLog}
                </button>
                {events.slice(0, MAX_EVENTS_VISIBLE).map((e) => (
                  <div
                    key={e.id}
                    className="rounded px-2 py-1 bg-black/40 text-[10px] font-mono truncate"
                    title={e.message}
                  >
                    <span className="text-cyan-400">{e.time}</span>{" "}
                    <span className="text-cyan-200">{e.module}</span>: {e.type}
                  </div>
                ))}
                {events.length > MAX_EVENTS_VISIBLE && (
                  <div className="text-cyan-500/60 text-[10px]">
                    +{events.length - MAX_EVENTS_VISIBLE} lagi
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        {icon} {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

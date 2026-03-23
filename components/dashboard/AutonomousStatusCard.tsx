"use client";

import { useDiagnosticsBridge } from "@/core/idik-autonomous/DiagnosticsBridge";
import { JARVIS } from "@/lib/copy/jarvis";
import { Activity, Database, Clock } from "lucide-react";

/**
 * Kartu status Autonomous — koneksi, event count, last update.
 * Nuansa JARVIS: informasi singkat seperti HUD.
 */
export function AutonomousStatusCard() {
  const { supabaseStatus, realtimeEvents, lastUpdate } = useDiagnosticsBridge();

  const statusLabel =
    supabaseStatus === "connected"
      ? JARVIS.connection.connected
      : supabaseStatus === "disconnected"
        ? JARVIS.connection.disconnected
        : JARVIS.connection.idle;

  const statusColor =
    supabaseStatus === "connected"
      ? "text-emerald-400"
      : supabaseStatus === "disconnected"
        ? "text-amber-400"
        : "text-cyan-400/80";

  const lastSyncText = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  return (
    <div
      className="rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-sm
                 p-4 text-sm text-cyan-200/90"
    >
      <div className="font-semibold text-cyan-300 mb-3 flex items-center gap-2">
        <Activity size={16} />
        Status Autonomous
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database size={14} />
            Koneksi
          </span>
          <span className={statusColor}>{statusLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity size={14} />
            {JARVIS.hud.realtimeEvents}
          </span>
          <span className="font-mono">{realtimeEvents}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock size={14} />
            Last sync
          </span>
          <span className="font-mono text-cyan-300/90">{lastSyncText}</span>
        </div>
      </div>
    </div>
  );
}

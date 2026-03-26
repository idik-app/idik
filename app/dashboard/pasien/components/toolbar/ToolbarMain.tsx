"use client";
import { Clock } from "lucide-react";
import { useToolbarLogic } from "./hooks/useToolbarLogic";
import { ToolbarHeader } from "./ToolbarHeader";
import ToolbarStatsCard from "./ToolbarStatsCard";
import FormTambahPasien from "../FormTambahPasien";
import { usePasienState } from "../../contexts/PasienContext";

/* 🔰 tambahan baru */
import { ToolbarRealtimeIndicator } from "./ToolbarRealtimeIndicator";
import { ToolbarQuickStats } from "./ToolbarQuickStats";
import PasienImport from "../PasienImport";
import PasienExport from "../PasienExport";
import PasienTable from "../PasienTable";

/*───────────────────────────────────────────────
🧬 ToolbarMain v5.2 — Interactive & Informative
───────────────────────────────────────────────*/
export default function ToolbarMain() {
  const { summary, isSyncing, isIdle } = useToolbarLogic();
  const { modalMode } = usePasienState();

  return (
    <div
      className={`w-full jarvis-glass flex flex-col gap-3 p-4 rounded-xl border animate-in fade-in slide-in-from-top-1 duration-200
                  border-cyan-700/40 backdrop-blur-md transition-opacity
                  shadow-[0_0_25px_rgba(0,255,255,0.08)]
                  ${isIdle ? "opacity-70" : "opacity-100"}`}
    >
      {/* ─────────────────────────────
         🔹 Filter + ringkasan (grid: filter lebar, ringkasan rapi di kanan)
      ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-6">
        <ToolbarHeader />
        <ToolbarStatsCard />
      </div>

      {/* ─────────────────────────────
         🔹 Layer interaktif tambahan
      ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cyan-700/30 pt-3">
        <div className="flex items-center gap-3">
          <ToolbarRealtimeIndicator />
          <ToolbarQuickStats />
          <div className="flex items-center gap-2">
            <PasienImport />
            <PasienExport />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────
         🔹 Info sinkronisasi
      ───────────────────────────── */}
      <div
        className={`text-[11px] text-right pr-2 animate-in fade-in slide-in-from-top-1 duration-200 ${
          isSyncing ? "text-yellow-400" : "text-cyan-400"
        }`}
      >
        <div className="flex items-center justify-end gap-1">
          <Clock size={12} />
          <span>Sinkron terakhir:</span>
          <span className="font-semibold">{summary?.lastSync ?? "—"}</span>
        </div>
      </div>

      {/* 🔹 Tabel — satu panel dengan filter & sinkron di atas */}
      <div className="border-t border-cyan-700/40 pt-3 min-h-0">
        <PasienTable embedded />
      </div>

      {/* 🔹 Modal tambah pasien */}
      {modalMode === "add" && <FormTambahPasien />}
    </div>
  );
}

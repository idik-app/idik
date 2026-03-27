"use client";

import { useEffect, useRef, useState } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useTindakanStats } from "./hooks/useTindakanStats";
import { useTindakanBridgeAdapter } from "./bridge/useTindakanBridgeAdapter";
import type { TindakanJoinResult } from "./bridge/mapping.types";
import TindakanHeader from "./components/TindakanHeader";
import TindakanSummary from "./components/TindakanSummary";
import TindakanTable from "./components/TindakanTable";
import TindakanDetailDrawer from "./components/TindakanDetailDrawer";

type ThemeTone = "cyan" | "emerald";

/** Tindakan medis — wireframe: daftar ringkas + drawer bertab + jembatan Pemakaian */
export default function TindakanDashboard() {
  const { show } = useNotification();
  const { stats, refreshStats, loading } = useTindakanStats();
  const adapter = useTindakanBridgeAdapter();

  const hasMounted = useRef(false);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [themeTone, setThemeTone] = useState<ThemeTone>("cyan");
  /** 🔄 Refresh awal */
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      refreshStats();
    }
  }, [refreshStats]);

  // Realtime listener removed (manual refresh mode).

  const drawerOpen = Boolean(adapter.detailOpenId && adapter.selectedRecord);

  return (
    <div
      key="tindakan-dashboard"
      className={`relative min-h-screen overflow-x-hidden overflow-y-auto text-white ${
        themeTone === "emerald"
          ? "bg-gradient-to-br from-slate-950 via-black to-emerald-950"
          : "bg-gradient-to-br from-slate-950 via-black to-cyan-950"
      }`}
    >
      <header
        className={`sticky top-0 z-30 bg-black/45 p-4 backdrop-blur-md md:p-6 ${
          themeTone === "emerald"
            ? "border-b border-emerald-900/35"
            : "border-b border-cyan-900/35"
        }`}
      >
        <TindakanHeader themeTone={themeTone} onThemeToneChange={setThemeTone} />
      </header>

      <main className="relative space-y-8 px-4 pb-24 pt-5 md:px-6 md:pt-6">
        <section className="sticky top-2 z-10 rounded-2xl border border-white/5 bg-black/20 p-2 backdrop-blur-sm">
          <TindakanSummary stats={stats} loading={loading} themeTone={themeTone} />
        </section>

        <section
          ref={tableRef}
          className={`relative rounded-2xl border bg-black/30 shadow-[0_20px_60px_rgba(8,47,73,0.25)] backdrop-blur-md ${
            themeTone === "emerald" ? "border-emerald-900/45" : "border-cyan-900/45"
          }`}
          id="tindakan-table-section"
        >
          <TindakanTable
            adapter={adapter}
          />
        </section>
      </main>

      <TindakanDetailDrawer
        open={drawerOpen}
        record={(adapter.selectedRecord as TindakanJoinResult | null) ?? null}
        onClose={adapter.closeDetailDrawer}
      />
    </div>
  );
}

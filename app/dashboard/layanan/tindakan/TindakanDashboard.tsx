"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import { useTindakanStatsFromList } from "./hooks/useTindakanStats";
import { useTindakanBridgeAdapter } from "./bridge/useTindakanBridgeAdapter";
import type { TindakanJoinResult } from "./bridge/mapping.types";
import TindakanHeader from "./components/TindakanHeader";
import TindakanSummary from "./components/TindakanSummary";
import TindakanTable from "./components/TindakanTable";

const TindakanDetailDrawer = dynamic(
  () => import("./components/TindakanDetailDrawer"),
  { ssr: false, loading: () => null },
);

type ThemeTone = "cyan" | "emerald";

/** Tindakan medis — wireframe: daftar ringkas + drawer bertab + jembatan Pemakaian */
export default function TindakanDashboard() {
  const adapter = useTindakanBridgeAdapter();
  const { stats, loading: statsLoading } = useTindakanStatsFromList(
    (adapter.tindakanList ?? []) as TindakanJoinResult[],
    Boolean(adapter.loading),
  );

  const tableRef = useRef<HTMLDivElement | null>(null);
  const [themeTone, setThemeTone] = useState<ThemeTone>("cyan");

  const drawerOpen = Boolean(adapter.detailOpenId && adapter.selectedRecord);

  return (
    <div
      key="tindakan-dashboard"
      className={`relative flex h-full min-h-0 flex-col overflow-hidden text-white ${
        themeTone === "emerald"
          ? "bg-gradient-to-br from-slate-950 via-black to-emerald-950"
          : "bg-gradient-to-br from-slate-950 via-black to-cyan-950"
      }`}
    >
      <header
        className={`shrink-0 z-30 bg-black/45 p-2 backdrop-blur-md sm:p-3 ${
          themeTone === "emerald"
            ? "border-b border-emerald-900/35"
            : "border-b border-cyan-900/35"
        }`}
      >
        <TindakanHeader themeTone={themeTone} onThemeToneChange={setThemeTone} />
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col gap-2 px-2 pb-3 pt-2 sm:gap-2.5 sm:px-3 sm:pb-4 sm:pt-2.5 md:px-4">
        <section className="shrink-0 rounded-lg border border-white/5 bg-black/20 px-2 py-1 backdrop-blur-sm sm:px-2.5 sm:py-1.5">
          <TindakanSummary
            stats={stats}
            loading={statsLoading}
            themeTone={themeTone}
          />
        </section>

        <section
          ref={tableRef}
          className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-black/30 shadow-[0_20px_60px_rgba(8,47,73,0.25)] backdrop-blur-md ${
            themeTone === "emerald" ? "border-emerald-900/45" : "border-cyan-900/45"
          }`}
          id="tindakan-table-section"
        >
          <TindakanTable adapter={adapter} />
        </section>
      </main>

      <TindakanDetailDrawer
        open={drawerOpen}
        record={(adapter.selectedRecord as TindakanJoinResult | null) ?? null}
        allTindakanRows={
          Array.isArray(adapter.tindakanList)
            ? (adapter.tindakanList as TindakanJoinResult[])
            : []
        }
        onClose={adapter.closeDetailDrawer}
        onRecordPatch={adapter.refresh}
      />
    </div>
  );
}

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
      className={`relative min-h-screen overflow-x-hidden overflow-y-auto text-white ${
        themeTone === "emerald"
          ? "bg-gradient-to-br from-slate-950 via-black to-emerald-950"
          : "bg-gradient-to-br from-slate-950 via-black to-cyan-950"
      }`}
    >
      <header
        className={`sticky top-0 z-30 bg-black/45 p-3 backdrop-blur-md sm:p-4 ${
          themeTone === "emerald"
            ? "border-b border-emerald-900/35"
            : "border-b border-cyan-900/35"
        }`}
      >
        <TindakanHeader themeTone={themeTone} onThemeToneChange={setThemeTone} />
      </header>

      <main className="relative space-y-3 px-3 pb-16 pt-3 sm:space-y-4 sm:px-4 sm:pt-4 md:px-5">
        <section className="sticky top-1 z-10 rounded-xl border border-white/5 bg-black/20 px-2 py-1.5 backdrop-blur-sm sm:px-2.5 sm:py-2">
          <TindakanSummary
            stats={stats}
            loading={statsLoading}
            themeTone={themeTone}
          />
        </section>

        <section
          ref={tableRef}
          className={`relative rounded-2xl border bg-black/30 shadow-[0_20px_60px_rgba(8,47,73,0.25)] backdrop-blur-md ${
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

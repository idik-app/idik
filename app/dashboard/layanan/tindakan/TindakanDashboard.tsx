"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { emptyTindakanKpiStats } from "./hooks/useTindakanStats";
import type { TindakanJoinResult } from "./bridge/mapping.types";
import { useTindakanBridgeAdapter } from "./bridge/useTindakanBridgeAdapter";
import TindakanHeader from "./components/TindakanHeader";
import TindakanHariIniModal from "./components/TindakanHariIniModal";
import TindakanSummary, {
  type TindakanFilteredSummary,
} from "./components/TindakanSummary";
import TindakanTable from "./components/TindakanTable";

const TindakanDetailDrawer = dynamic(
  () => import("./components/TindakanDetailDrawer"),
  { ssr: false, loading: () => null },
);

type ThemeTone = "cyan" | "emerald";

/** Tindakan medis — wireframe: daftar ringkas + drawer bertab + jembatan Pemakaian */
export default function TindakanDashboard() {
  const adapter = useTindakanBridgeAdapter();

  const tableRef = useRef<HTMLDivElement | null>(null);
  const [themeTone, setThemeTone] = useState<ThemeTone>("cyan");
  const [todayModalOpen, setTodayModalOpen] = useState(false);
  const [filteredSummary, setFilteredSummary] =
    useState<TindakanFilteredSummary | null>(null);
  const onFilteredSummaryChange = useCallback(
    (next: TindakanFilteredSummary) => {
      setFilteredSummary(next);
    },
    [],
  );

  const drawerOpen = Boolean(adapter.detailOpenId && adapter.selectedRecord);

  /** KPI header = snapshot terfilter dari tabel (bukan seluruh API). */
  const stats = filteredSummary?.stats ?? emptyTindakanKpiStats();
  const summaryLoading =
    Boolean(adapter.loading) || filteredSummary === null;

  return (
    <div
      key="tindakan-dashboard"
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden transition-colors duration-500",
        "text-slate-900 font-semibold bg-gradient-to-br from-slate-100 via-white to-cyan-50/60 dark:text-white",
        themeTone === "emerald"
          ? "dark:bg-gradient-to-br dark:from-slate-950 dark:via-black dark:to-emerald-950"
          : "dark:bg-gradient-to-br dark:from-slate-950 dark:via-black dark:to-cyan-950",
      )}
    >
      <header
        className={cn(
          "shrink-0 z-30 px-2 py-1 sm:px-2.5 sm:py-1.5 transition-colors duration-500",
          "bg-white/50 dark:bg-black/35",
        )}
      >
        <TindakanHeader
          themeTone={themeTone}
          onThemeToneChange={setThemeTone}
          dashboardRows={
            Array.isArray(adapter.tindakanList)
              ? (adapter.tindakanList as TindakanJoinResult[])
              : []
          }
          dashboardLoading={Boolean(adapter.loading)}
          summary={
            <TindakanSummary
              stats={stats}
              loading={summaryLoading}
              themeTone={themeTone}
              variant="header"
              filtered={filteredSummary}
              onTodayKpiClick={() => setTodayModalOpen(true)}
            />
          }
        />
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col gap-0 px-1.5 pb-2 pt-0.5 sm:px-2 sm:pb-2.5 md:px-3">
        <section
          ref={tableRef}
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
          id="tindakan-table-section"
        >
          <TindakanTable
            adapter={adapter}
            onFilteredSummaryChange={onFilteredSummaryChange}
          />
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

      <TindakanHariIniModal
        open={todayModalOpen}
        onOpenChange={setTodayModalOpen}
        rows={
          Array.isArray(adapter.tindakanList)
            ? (adapter.tindakanList as TindakanJoinResult[])
            : []
        }
        loading={Boolean(adapter.loading)}
        themeTone={themeTone}
      />
    </div>
  );
}

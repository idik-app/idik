"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { emptyTindakanKpiStats } from "./hooks/useTindakanStats";
import type { TindakanJoinResult } from "./bridge/mapping.types";
import { useTindakanBridgeAdapter } from "./bridge/useTindakanBridgeAdapter";
import TindakanHeader from "./components/TindakanHeader";
import TindakanHariIniModal from "./components/TindakanHariIniModal";
import TindakanRoleAccessModal, {
  type AccessTarget,
} from "./components/TindakanRoleAccessModal";
import TindakanSummary, {
  type TindakanFilteredSummary,
} from "./components/TindakanSummary";
import TindakanTable from "./components/TindakanTable";

const TindakanDetailDrawer = dynamic(
  () => import("./components/TindakanDetailDrawer"),
  { ssr: false, loading: () => null },
);

/** Tindakan medis — wireframe: daftar ringkas + drawer bertab + jembatan Pemakaian */
export default function TindakanDashboard() {
  const adapter = useTindakanBridgeAdapter();

  const tableRef = useRef<HTMLDivElement | null>(null);
  const themeTone = "cyan" as const;
  const [todayModalOpen, setTodayModalOpen] = useState(false);
  const [roleAccessOpen, setRoleAccessOpen] = useState(false);
  const [roleAccessTarget, setRoleAccessTarget] =
    useState<AccessTarget>("depo");
  const [filteredSummary, setFilteredSummary] =
    useState<TindakanFilteredSummary | null>(null);
  const onFilteredSummaryChange = useCallback(
    (next: TindakanFilteredSummary) => {
      setFilteredSummary(next);
    },
    [],
  );

  const drawerOpen = Boolean(adapter.detailOpenId && adapter.selectedRecord);
  const onRoleAccessClick = useCallback((target: AccessTarget) => {
    setRoleAccessTarget(target);
    setRoleAccessOpen(true);
  }, []);

  /** KPI header = snapshot terfilter dari tabel (bukan seluruh API). */
  const stats = filteredSummary?.stats ?? emptyTindakanKpiStats();
  const summaryLoading = Boolean(adapter.loading) || filteredSummary === null;

  return (
    <div
      key="tindakan-dashboard"
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden transition-colors duration-500",
        "font-semibold text-slate-900 dark:text-white",
        "bg-gradient-to-br from-slate-50 via-white to-cyan-50/45 dark:from-slate-950 dark:via-black dark:to-cyan-950",
      )}
    >
      <header
        className={cn(
          "shrink-0 z-30 px-2 py-1 sm:px-2.5 sm:py-1.5 transition-colors duration-500",
          "bg-white/88 border-b border-slate-200/80 dark:border-white/10 dark:bg-black/35",
        )}
      >
        <TindakanHeader
          themeTone={themeTone}
          onRoleAccessClick={onRoleAccessClick}
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

      <TindakanRoleAccessModal
        open={roleAccessOpen}
        target={roleAccessTarget}
        onOpenChange={setRoleAccessOpen}
      />
    </div>
  );
}

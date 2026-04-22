"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import { Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useUI } from "@/app/contexts/UIContext";
import { cn } from "@/lib/utils";
import { emptyTindakanKpiStats } from "./hooks/useTindakanStats";
import type { TindakanJoinResult } from "./bridge/mapping.types";
import { useTindakanBridgeAdapter } from "./bridge/useTindakanBridgeAdapter";
import TindakanHeader from "./components/TindakanHeader";
import TindakanHariIniModal from "./components/TindakanHariIniModal";
import TindakanWeeklyPpciModal from "./components/TindakanWeeklyPpciModal";
import TindakanDashboardModal from "./components/TindakanDashboardModal";
import PhoneShortcutsBar from "./components/PhoneShortcutsBar";
import TindakanRoleAccessModal, {
  type AccessTarget,
} from "./components/TindakanRoleAccessModal";
import TindakanSummary, {
  type TindakanFilteredSummary,
} from "./components/TindakanSummary";
import TindakanTable from "./components/TindakanTable";
import FastTrackListModal from "./components/FastTrackListModal";
import { UI_LAYERS } from "@/lib/ui/layers";

const TindakanDetailDrawer = dynamic(
  () => import(/* webpackPrefetch: true */ "./components/TindakanDetailDrawer"),
  { ssr: false, loading: () => null },
);

/** Tindakan medis — wireframe: daftar ringkas + drawer bertab + jembatan Pemakaian */
export default function TindakanDashboard() {
  const adapter = useTindakanBridgeAdapter();
  const { isMobile } = useUI();

  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  // Auto-collapse on mobile on mount/resize, expand on desktop
  useEffect(() => {
    setIsHeaderCollapsed(isMobile);
    setIsFilterCollapsed(isMobile);
  }, [isMobile]);

  const tableRef = useRef<HTMLDivElement | null>(null);
  const themeTone = "cyan" as const;
  const [todayModalOpen, setTodayModalOpen] = useState(false);
  const [weeklyPpciModalOpen, setWeeklyPpciModalOpen] = useState(false);
  const [fastTrackModalOpen, setFastTrackModalOpen] = useState(false);
  const [roleAccessOpen, setRoleAccessOpen] = useState(false);
  const [phoneDirectoryOpen, setPhoneDirectoryOpen] = useState(false);
  const [roleAccessTarget, setRoleAccessTarget] =
    useState<AccessTarget>("depo");
  const [filteredSummary, setFilteredSummary] =
    useState<TindakanFilteredSummary | null>(null);
  const onFilteredSummaryChange = useCallback(
    (next: TindakanFilteredSummary) => {
      /* KPI header boleh tertunda sedikit agar interaksi tabel/filter tetap responsif. */
      startTransition(() => {
        setFilteredSummary(next);
      });
    },
    [],
  );

  const drawerOpen = Boolean(adapter.detailOpenId);
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
        "relative flex min-h-0 flex-col transition-colors duration-500",
        "h-full overflow-hidden max-md:h-auto max-md:overflow-visible md:h-full md:overflow-hidden",
        "font-semibold text-slate-900 dark:text-white",
        "bg-gradient-to-br from-slate-50 via-white to-cyan-50/45 dark:from-slate-950 dark:via-black dark:to-cyan-950",
      )}
    >
      <header
        className={cn(
          "shrink-0 z-30 px-1.5 py-0.5 sm:px-2 sm:py-1 transition-colors duration-500",
          "bg-white/88 border-b border-slate-200/80 dark:border-white/10 dark:bg-black/35",
        )}
      >
        <TindakanHeader
          themeTone={themeTone}
          onRoleAccessClick={onRoleAccessClick}
          onPhoneDirectoryOpen={() => setPhoneDirectoryOpen(true)}
          dashboardRows={
            Array.isArray(adapter.tindakanList)
              ? (adapter.tindakanList as TindakanJoinResult[])
              : []
          }
          dashboardLoading={Boolean(adapter.loading)}
          isCollapsed={isHeaderCollapsed}
          onToggleCollapse={() => setIsHeaderCollapsed((prev) => !prev)}
          isFilterCollapsed={isFilterCollapsed}
          onToggleFilterCollapse={() => setIsFilterCollapsed((prev) => !prev)}
          summary={
            <TindakanSummary
              stats={stats}
              loading={summaryLoading}
              themeTone={themeTone}
              variant="header"
              filtered={filteredSummary}
              onTodayKpiClick={() => setTodayModalOpen(true)}
              onFastTrackKpiClick={() => setFastTrackModalOpen(true)}
              onWeeklyPpciKpiClick={() => setWeeklyPpciModalOpen(true)}
            />
          }
        />
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col gap-0 px-1 pb-1.5 pt-0 max-md:flex-none sm:px-1.5 sm:pb-2 md:px-2">
        {/* Shortcuts Section — Collapsible with Header on Mobile */}
        <AnimatePresence initial={false}>
          {!isHeaderCollapsed && (
            <motion.div
              initial={isHeaderCollapsed ? { height: 0, opacity: 0 } : false}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <PhoneShortcutsBar themeTone={themeTone} />
            </motion.div>
          )}
        </AnimatePresence>

        <section
          ref={tableRef}
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden max-md:flex-none max-md:overflow-visible"
          id="tindakan-table-section"
        >
          <TindakanTable
            adapter={adapter}
            onFilteredSummaryChange={onFilteredSummaryChange}
            isFilterCollapsed={isFilterCollapsed}
          />
        </section>

        {/* Floating Speed Dial for Phone Directory */}
        <button
          type="button"
          onClick={() => setPhoneDirectoryOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all active:scale-95 group",
            UI_LAYERS.fab,
            "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/25",
            "dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:shadow-cyan-900/40",
          )}
          title="Direktori Telepon Internal"
        >
          <Phone className="h-6 w-6 group-hover:animate-pulse" />
          <span className="absolute right-full mr-3 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-800">
            Direktori Telepon
          </span>
        </button>
      </main>

      <TindakanDetailDrawer
        open={drawerOpen}
        initialTab={adapter.detailInitialTab as any}
        record={
          (adapter.selectedRecord as TindakanJoinResult | null) ??
          (filteredSummary?.allRows?.find(
            (r) => String(r.id) === String(adapter.detailOpenId),
          ) as TindakanJoinResult | null) ??
          null
        }
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
          (filteredSummary?.allRows as TindakanJoinResult[]) ??
          (Array.isArray(adapter.tindakanList)
            ? (adapter.tindakanList as TindakanJoinResult[])
            : [])
        }
        loading={Boolean(adapter.loading)}
        themeTone={themeTone}
        onRecordPatch={adapter.refresh}
      />

      <FastTrackListModal
        open={fastTrackModalOpen}
        onOpenChange={setFastTrackModalOpen}
        rows={
          (filteredSummary?.allRows as TindakanJoinResult[]) ??
          (Array.isArray(adapter.tindakanList)
            ? (adapter.tindakanList as TindakanJoinResult[])
            : [])
        }
        loading={Boolean(adapter.loading)}
        doctorOptionsMaster={[]} // Will be loaded inside if needed or pass from context
        onRecordPatch={adapter.refresh}
      />

      <TindakanWeeklyPpciModal
        open={weeklyPpciModalOpen}
        onOpenChange={setWeeklyPpciModalOpen}
        rows={
          (filteredSummary?.allRows as TindakanJoinResult[]) ??
          (Array.isArray(adapter.tindakanList)
            ? (adapter.tindakanList as TindakanJoinResult[])
            : [])
        }
        loading={Boolean(adapter.loading)}
        onRecordPatch={adapter.refresh}
      />

      <TindakanDashboardModal
        open={phoneDirectoryOpen}
        onOpenChange={setPhoneDirectoryOpen}
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

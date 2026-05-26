"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  startTransition,
} from "react";
import { Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { mutate } from "swr";

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
import TindakanDetailDrawer from "./components/TindakanDetailDrawer";
import FastTrackListModal from "./components/FastTrackListModal";
import { UI_LAYERS } from "@/lib/ui/layers";
import { PhoneDirectoryProvider } from "./contexts/PhoneDirectoryContext";

/** Baris awal tabel yang “dipanaskan” (cache SWR) agar klik baris/RM memakai data penuh tanpa jeda. */
const TINDAKAN_DETAIL_SWR_WARM = 20;

/** Tindakan medis — wireframe: daftar ringkas + drawer bertab + jembatan Pemakaian */
export default function TindakanDashboard() {
  const adapter = useTindakanBridgeAdapter();
  const { isMobile } = useUI();

  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  // Auto-collapse on mobile on mount/resize
  useEffect(() => {
    if (isMobile) {
      setIsHeaderCollapsed(true);
      setIsFilterCollapsed(true);
    }
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

  /**
   * Panjang array dependency wajib tetap (React 19 / rules-of-hooks "changed size" error
   * bila isi / spread halaman tindakan bocor ke deps). Di sini: selalu
   * `[loading, tindakanListRef]`; urutan 20 id pertama dilacak lewat ref, bukan
   * dimasukkan per-id ke array deps.
   */
  const lastPrefetchHeadSig = useRef<string | null>(null);

  useEffect(() => {
    if (adapter.loading) return;
    if (!Array.isArray(adapter.tindakanList) || !adapter.tindakanList.length) {
      lastPrefetchHeadSig.current = null;
      return;
    }

    const head = adapter.tindakanList
      .slice(0, TINDAKAN_DETAIL_SWR_WARM) as TindakanJoinResult[];
    const headSig = head
      .map((r) => String((r as TindakanJoinResult).id ?? ""))
      .join("\x1f");
    if (!headSig) {
      return;
    }
    if (headSig === lastPrefetchHeadSig.current) {
      return;
    }
    lastPrefetchHeadSig.current = headSig;

    const run = () => {
      const jsonFetcher = (url: string) => fetch(url).then((r) => r.json());
      for (const row of head) {
        const id = String(row.id ?? "").trim();
        if (!id) continue;
        const tKey = `/api/tindakan/${encodeURIComponent(id)}`;
        void jsonFetcher(tKey)
          .then((json) => mutate(tKey, json, { revalidate: false }))
          .catch(() => {});

        const pid = String(row.pasien_id ?? "").trim();
        const noRm = String(row.no_rm ?? "").trim();
        if (pid) {
          const pKey = `/api/pasien/${encodeURIComponent(pid)}`;
          void jsonFetcher(pKey)
            .then((json) => mutate(pKey, json, { revalidate: false }))
            .catch(() => {});
        } else if (noRm) {
          const pKey = `/api/pasien?noRm=${encodeURIComponent(noRm)}`;
          void jsonFetcher(pKey)
            .then((json) => mutate(pKey, json, { revalidate: false }))
            .catch(() => {});
        }
      }
    };

    if (typeof window === "undefined") return;
    const ric = window.requestIdleCallback?.(run, { timeout: 4000 });
    if (ric != null) {
      return () => window.cancelIdleCallback?.(ric);
    }
    const t = window.setTimeout(run, 1);
    return () => clearTimeout(t);
  }, [adapter.loading, adapter.tindakanList]);

  return (
    <PhoneDirectoryProvider>
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
            onPhoneDirectoryOpen={() => setPhoneDirectoryOpen(true)}
          />
        </section>
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
        onRecordPatch={adapter.syncListAfterAutosave}
        patchTindakanFields={adapter.saveEditor}
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
        onRecordPatch={adapter.syncListAfterAutosave}
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
        onRecordPatch={adapter.syncListAfterAutosave}
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
        onRecordPatch={adapter.syncListAfterAutosave}
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
    </PhoneDirectoryProvider>
  );
}

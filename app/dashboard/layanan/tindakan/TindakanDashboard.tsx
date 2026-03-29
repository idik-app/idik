"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
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
  const { theme } = useTheme();
  const isLight = theme === "light";

  const drawerOpen = Boolean(adapter.detailOpenId && adapter.selectedRecord);

  return (
    <div
      key="tindakan-dashboard"
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden transition-colors duration-500",
        isLight
          ? "text-slate-900 font-semibold bg-gradient-to-br from-slate-100 via-white to-cyan-50/60"
          : "text-white",
        !isLight &&
          (themeTone === "emerald"
            ? "bg-gradient-to-br from-slate-950 via-black to-emerald-950"
            : "bg-gradient-to-br from-slate-950 via-black to-cyan-950"),
      )}
    >
      <header
        className={cn(
          "shrink-0 z-30 px-2 py-1 sm:px-2.5 sm:py-1.5 transition-colors duration-500",
          isLight ? "bg-white/50" : "bg-black/35",
        )}
      >
        <TindakanHeader
          themeTone={themeTone}
          onThemeToneChange={setThemeTone}
          summary={
            <TindakanSummary
              stats={stats}
              loading={statsLoading}
              themeTone={themeTone}
              variant="header"
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

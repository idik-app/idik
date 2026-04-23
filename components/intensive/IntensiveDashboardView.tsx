"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
  useRef,
  useMemo,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Maximize2,
  Settings,
  Activity,
  Droplets,
  Thermometer,
  Wind,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFlowSheetStore, Resolution } from "@/lib/store/useFlowSheetStore";
import FlowSheetGrid from "@/components/intensive/FlowSheetGrid";
import HemodynamicChart from "@/components/intensive/HemodynamicChart";
import IntensivePatientSidebar, {
  buildIntensivePatientHeadline,
  type IntensiveTindakanListRow,
} from "@/components/intensive/IntensivePatientSidebar";
import { startOfDay, format, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { intensiveTimelineTotalWidthPx } from "@/lib/intensive/timelineLayout";
import { latestVitalsSummary } from "@/lib/intensive/latestVitalsFromData";

const DEFAULT_DEMO_HEADLINE = "Ny. Siti Aminah (65th) • RM: 123-45-67";
const DEFAULT_BACK_HREF = "/dashboard/layanan/tindakan";

export type IntensiveDashboardViewProps = {
  patientHeadline?: string | null;
  tindakanId?: string | null;
  embedded?: boolean;
  onRequestClose?: () => void;
  backHref?: string;
};

const TimeResolutionControl = () => {
  const { resolution, setResolution } = useFlowSheetStore();

  return (
    <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
      {(["1m", "15m", "1h"] as Resolution[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setResolution(r)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            resolution === r
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
};

function IntensiveDashboardViewInner({
  patientHeadline,
  tindakanId,
  embedded = false,
  onRequestClose,
  backHref = DEFAULT_BACK_HREF,
}: IntensiveDashboardViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const replaceData = useFlowSheetStore((s) => s.replaceData);
  const updateData = useFlowSheetStore((s) => s.updateData);
  const data = useFlowSheetStore((s) => s.data);
  const { resolution } = useFlowSheetStore();

  const loadGenRef = useRef(0);
  const outgoingIdRef = useRef<string | undefined>(undefined);
  const [hydratedForId, setHydratedForId] = useState<string | null>(null);

  const vitalsStrip = useMemo(() => latestVitalsSummary(data), [data]);

  const urlTindakanId = embedded
    ? undefined
    : searchParams.get("tindakanId")?.trim() ||
      tindakanId?.trim() ||
      undefined;

  const [embeddedTindakanId, setEmbeddedTindakanId] = useState<
    string | undefined
  >(() => (embedded ? tindakanId?.trim() || undefined : undefined));

  const [patientHeadlineState, setPatientHeadlineState] = useState<
    string | undefined
  >(() => patientHeadline?.trim() || undefined);

  useEffect(() => {
    if (!embedded) return;
    setEmbeddedTindakanId(tindakanId?.trim() || undefined);
    const h = patientHeadline?.trim();
    if (h) setPatientHeadlineState(h);
  }, [embedded, tindakanId, patientHeadline]);

  const effectiveTindakanId = embedded
    ? embeddedTindakanId
    : urlTindakanId;

  /** Muat / simpan flow sheet per pasien + sinkron header dari baris tindakan. */
  useEffect(() => {
    const id = effectiveTindakanId;
    const gen = ++loadGenRef.current;
    const outgoing = outgoingIdRef.current;

    const persist = async (tid: string, snapshot: typeof data) => {
      try {
        await fetch("/api/intensive/flow-sheet", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tindakanId: tid, payload: { data: snapshot } }),
        });
      } catch {
        /* noop */
      }
    };

    void (async () => {
      if (outgoing && outgoing !== id) {
        await persist(outgoing, useFlowSheetStore.getState().data);
      }

      if (!id) {
        if (gen !== loadGenRef.current) return;
        replaceData({});
        outgoingIdRef.current = undefined;
        setHydratedForId(null);
        return;
      }

      const [sheetRes, tindakanRes] = await Promise.all([
        fetch(
          `/api/intensive/flow-sheet?tindakanId=${encodeURIComponent(id)}`,
        ).then((r) => r.json()),
        fetch(`/api/tindakan?tindakanId=${encodeURIComponent(id)}&limit=1`).then(
          (r) => r.json(),
        ),
      ]);

      if (gen !== loadGenRef.current) return;

      const nextData =
        sheetRes?.ok && sheetRes.payload?.data ? sheetRes.payload.data : {};
      replaceData(nextData);
      outgoingIdRef.current = id;
      setHydratedForId(id);

      if (tindakanRes?.ok && Array.isArray(tindakanRes.data) && tindakanRes.data[0]) {
        const row = tindakanRes.data[0] as IntensiveTindakanListRow &
          Record<string, unknown>;
        if (String(row.id ?? "").trim() === id) {
          setPatientHeadlineState(buildIntensivePatientHeadline(row));
          const diag = row.diagnosa;
          if (diag != null && String(diag).trim()) {
            updateData("diagnosa", "static", String(diag).trim());
          }
        }
      } else if (!embedded) {
        setPatientHeadlineState(`Tindakan ID: ${id}`);
      } else {
        const h = patientHeadline?.trim();
        setPatientHeadlineState(h || `Tindakan ID: ${id}`);
      }
    })();
  }, [effectiveTindakanId, embedded, patientHeadline, replaceData, updateData]);

  /** Autosave ringan saat mengedit grid untuk pasien yang sedang aktif. */
  useEffect(() => {
    if (!hydratedForId || hydratedForId !== effectiveTindakanId) return;
    const tid = hydratedForId;
    const t = window.setTimeout(() => {
      void fetch("/api/intensive/flow-sheet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tindakanId: tid,
          payload: { data: useFlowSheetStore.getState().data },
        }),
      });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [data, hydratedForId, effectiveTindakanId]);

  const handleSelectPatient = useCallback(
    (nextId: string, headline: string) => {
      setPatientHeadlineState(headline.trim());
      if (embedded) {
        setEmbeddedTindakanId(nextId);
      } else if (pathname) {
        router.replace(
          `${pathname}?tindakanId=${encodeURIComponent(nextId)}`,
          { scroll: false },
        );
      }
    },
    [embedded, pathname, router],
  );

  const resolvedHeadline =
    (patientHeadlineState && patientHeadlineState.trim()) ||
    (effectiveTindakanId ? `Tindakan ID: ${effectiveTindakanId}` : null) ||
    DEFAULT_DEMO_HEADLINE;

  useEffect(() => {
    const trendScroll = document.getElementById("trend-scroll-container");
    const gridScroll = document.getElementById("flow-sheet-grid-container");

    if (!trendScroll || !gridScroll) return;

    const handleTrendScroll = () => {
      gridScroll.scrollLeft = trendScroll.scrollLeft;
    };

    const handleGridScroll = () => {
      trendScroll.scrollLeft = gridScroll.scrollLeft;
    };

    trendScroll.addEventListener("scroll", handleTrendScroll);
    gridScroll.addEventListener("scroll", handleGridScroll);

    return () => {
      trendScroll.removeEventListener("scroll", handleTrendScroll);
      gridScroll.removeEventListener("scroll", handleGridScroll);
    };
  }, [resolution]);

  const fullPageHref = effectiveTindakanId
    ? `/intensive/dashboard?tindakanId=${encodeURIComponent(effectiveTindakanId)}`
    : "/intensive/dashboard";

  return (
    <div
      className={cn(
        "bg-black text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30",
        embedded ? "min-h-0 h-full" : "min-h-screen",
        isFullscreen && "fixed inset-0 z-[9999]",
      )}
    >
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          {onRequestClose ? (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="text-zinc-400 hover:text-white shrink-0"
              onClick={onRequestClose}
              aria-label="Tutup monitoring ICU"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white shrink-0"
              asChild
            >
              <Link href={backHref} aria-label="Kembali ke daftar tindakan">
                <ChevronLeft className="w-5 h-5" />
              </Link>
            </Button>
          )}
          <div className="flex items-center gap-6 min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2 min-w-0 truncate">
              <div className="flex items-center justify-center w-5 h-5 rounded-md bg-blue-500/20 border border-blue-500/30 shrink-0">
                <Activity className="w-3 h-3 text-blue-400" />
              </div>
              <span className="truncate">Patient: {resolvedHeadline}</span>
            </h1>

            <div className="h-8 w-[1px] bg-zinc-800 hidden lg:block shrink-0" />

            <div className="hidden lg:flex items-center gap-6 shrink-0">
              <div className="flex flex-col">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                  DIIT
                </span>
                <span className="text-[10px] text-blue-400 font-bold uppercase">
                  {data["diit"]?.["static"] || "Belum diisi"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                  Diagnosa Medis
                </span>
                <span className="text-[10px] text-blue-400 font-bold uppercase">
                  {data["diagnosa"]?.["static"] || "Belum diisi"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {embedded && effectiveTindakanId ? (
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-1.5 h-8 text-[10px]"
              asChild
            >
              <Link href={fullPageHref}>
                <ExternalLink className="w-3.5 h-3.5" />
                Buka layar penuh
              </Link>
            </Button>
          ) : null}

          <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setZoomLevel(zoomLevel === 1 ? 0.8 : 1)}
                className={`h-7 px-3 text-[10px] font-bold transition-all ${
                  zoomLevel === 0.8
                    ? "bg-blue-600 text-white"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {zoomLevel === 0.8 ? "Normal View" : "Zoom Out (80%)"}
              </Button>
            </div>

            <div className="h-4 w-[1px] bg-zinc-800 hidden md:block" />

            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">
                Resolusi Waktu
              </span>
              <TimeResolutionControl />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-2 h-8"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-xs hidden sm:inline">
                {isFullscreen ? "Exit" : "Full View"}
              </span>
            </Button>
            <Button variant="ghost" size="icon" type="button" className="text-zinc-400">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-row overflow-hidden">
        <IntensivePatientSidebar
          selectedTindakanId={effectiveTindakanId}
          onSelectPatient={handleSelectPatient}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-zinc-800">
          <div className="bg-zinc-900/30 border-b border-zinc-800/50 px-4 py-2 flex items-center gap-8 overflow-x-auto no-scrollbar">
            <StatMini
              icon={<Activity className="text-red-400" />}
              label="HR"
              value={vitalsStrip.hr}
              unit="bpm"
            />
            <StatMini
              icon={<Activity className="text-blue-400" />}
              label="BP"
              value={vitalsStrip.bp}
              unit="mmHg"
            />
            <StatMini
              icon={<Wind className="text-emerald-400" />}
              label="SpO2"
              value={vitalsStrip.spo2}
              unit="%"
            />
            <StatMini
              icon={<Thermometer className="text-orange-400" />}
              label="TEMP"
              value={vitalsStrip.temp}
              unit="°C"
            />
            <StatMini
              icon={<Droplets className="text-cyan-400" />}
              label="BALANCE"
              value={vitalsStrip.balance}
              unit="ml/24h"
            />
          </div>

          <section className="bg-zinc-950 border-b border-zinc-800 flex overflow-hidden">
            <div className="w-[200px] bg-zinc-900 border-r border-zinc-800 flex items-center px-4 shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  Hemodynamic Trend
                </span>
                <span className="text-[8px] text-zinc-500 uppercase">
                  Real-time Visualization
                </span>
              </div>
            </div>

            <div
              className="flex-1 overflow-x-auto no-scrollbar"
              id="trend-scroll-container"
            >
              <div
                style={{
                  width: `${intensiveTimelineTotalWidthPx(resolution)}px`,
                }}
              >
                <HemodynamicChartContainer />
              </div>
            </div>
          </section>

          <FlowSheetGrid zoomLevel={zoomLevel} />
        </div>

        <aside className="w-[380px] bg-zinc-950 flex flex-col border-l border-zinc-800 overflow-y-auto scrollbar-thin">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Status & Monitoring Statis
            </h3>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <InvasivePanel />
        </aside>
      </main>

      <footer className="h-8 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 text-[10px] text-zinc-500 shrink-0">
        <div className="flex gap-4 min-w-0 truncate">
          <span className="truncate">Server Time: 2026-04-23 21:35:12</span>
          <span className="text-emerald-500 font-bold hidden sm:inline">
            ● Connected to Supabase Realtime
          </span>
        </div>
        <div className="hidden sm:block">v0.1.0-alpha • Powered by Antigravity AI</div>
      </footer>
    </div>
  );
}

export default function IntensiveDashboardView(
  props: IntensiveDashboardViewProps,
) {
  return (
    <Suspense
      fallback={
        <div
          className={cn(
            "flex items-center justify-center bg-black text-xs text-zinc-500",
            props.embedded ? "min-h-[240px]" : "min-h-screen",
          )}
        >
          Memuat…
        </div>
      }
    >
      <IntensiveDashboardViewInner {...props} />
    </Suspense>
  );
}

function StatMini({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactElement<{ size?: number }>;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <div className="p-1.5 bg-white/5 rounded-md">
        {React.cloneElement(icon, { size: 14 })}
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[9px] text-zinc-500 font-bold uppercase">{label}</span>
        <span className="text-sm font-bold text-zinc-200">
          {value}{" "}
          <span className="text-[10px] font-normal text-zinc-500 uppercase">{unit}</span>
        </span>
      </div>
    </div>
  );
}

function HemodynamicChartContainer() {
  const { resolution } = useFlowSheetStore();

  const columns = React.useMemo(() => {
    const start = startOfDay(new Date());
    const cols: Date[] = [];
    const step = resolution === "1m" ? 1 : resolution === "15m" ? 15 : 60;
    const totalMinutes = 24 * 60;

    for (let i = 0; i < totalMinutes; i += step) {
      cols.push(addMinutes(start, i));
    }
    return cols;
  }, [resolution]);

  const width = intensiveTimelineTotalWidthPx(resolution);

  return <HemodynamicChart columns={columns} width={width} />;
}

function InvasivePanel() {
  const { groups, data, updateData } = useFlowSheetStore();
  const rightPanelGroups = groups.filter((g) =>
    ["invasive", "monitoring"].includes(g.id),
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      {rightPanelGroups.map((group) => (
        <div key={group.id} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              {group.name}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {group.parameters.map((param) => (
              <div
                key={param.id}
                className="bg-zinc-900/50 border border-zinc-800 p-2 rounded-lg flex flex-col gap-1.5 hover:border-zinc-700 transition-colors"
              >
                <span
                  className="text-[10px] font-medium text-zinc-400 leading-tight truncate"
                  title={param.name}
                >
                  {param.name}
                </span>

                {param.unit?.toLowerCase().includes("ya/tidak") ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateData(param.id, "static", "Ya")}
                      className={`flex-1 py-1 rounded text-[9px] font-bold transition-all ${
                        data[param.id]?.["static"] === "Ya"
                          ? "bg-blue-600 text-white shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => updateData(param.id, "static", "Tidak")}
                      className={`flex-1 py-1 rounded text-[9px] font-bold transition-all ${
                        data[param.id]?.["static"] === "Tidak"
                          ? "bg-zinc-600 text-white shadow-[0_0_8px_rgba(113,113,122,0.5)]"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      Tidak
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <input
                      className="bg-transparent text-blue-400 text-xs font-bold outline-none placeholder:text-zinc-700"
                      placeholder={param.unit || "Isi..."}
                      value={data[param.id]?.["static"] || ""}
                      onChange={(e) =>
                        updateData(param.id, "static", e.target.value)
                      }
                    />
                    {param.unit && (
                      <span className="text-[8px] text-zinc-600 font-bold uppercase">
                        {param.unit}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <span className="text-[9px] font-bold text-blue-400 uppercase">
          Catatan Khusus ICU
        </span>
        <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
          Panel ini berisi status statis harian. Data di sini tidak terpengaruh oleh scroll
          waktu di kiri.
        </p>
      </div>
    </div>
  );
}

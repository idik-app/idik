"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useDragControls } from "framer-motion";
import { AlertTriangle, Mars, Venus } from "lucide-react";

import type { PasienOption } from "@/components/ui/pasien-combobox";
import type { TindakanFilteredSummary } from "@/app/dashboard/layanan/tindakan/components/TindakanSummary";
import {
  computeActiveDoctors,
  computeCriticalAlerts,
  computePpciTrendSeries,
  computeTodayPatients,
} from "@/lib/jarvis-mode/computeJarvisModeData";
import {
  clampJarvisRect,
  computeJarvisCanvasHeightPx,
  DEFAULT_JARVIS_WIDGET_LAYOUT,
  loadJarvisWidgetLayout,
  resetJarvisWidgetLayout,
  saveJarvisWidgetLayout,
  type JarvisWidgetId,
  type JarvisWidgetRect,
} from "@/lib/jarvis-mode/dashboardLayout";
import type { TindakanJoinResult } from "@/app/dashboard/layanan/tindakan/bridge/mapping.types";
import { cn } from "@/lib/utils";

import JarvisModeGlassPanel from "./JarvisModeGlassPanel";
import JarvisModeLaporanTindakan from "./JarvisModeLaporanTindakan";
import JarvisModePpciChart from "./JarvisModePpciChart";

type Props = {
  rows: readonly TindakanJoinResult[];
  stats: Record<string, number>;
  filtered?: TindakanFilteredSummary | null;
  pasienOptions?: readonly PasienOption[];
  loading?: boolean;
  /** Mode panel mengambang (lebih ringkas) */
  compact?: boolean;
};

function DraggableWidget({
  rect,
  index,
  containerRef,
  onMove,
  children,
}: {
  rect: JarvisWidgetRect;
  index: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onMove: (id: JarvisWidgetId, next: JarvisWidgetRect) => void;
  children: ReactNode;
}) {
  const dragControls = useDragControls();
  const flowContent = rect.id === "laporan-tindakan";

  return (
    <motion.div
      className={cn("absolute touch-none", flowContent && "overflow-visible")}
      style={{
        left: `${rect.x}%`,
        top: `${rect.y}%`,
        width: `${rect.w}%`,
        ...(flowContent
          ? { minHeight: `${rect.h}%`, height: "auto" }
          : { height: `${rect.h}%` }),
        padding: 5,
      }}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0.06}
      dragConstraints={containerRef}
      whileDrag={{ scale: 1.02, zIndex: 50 }}
      onDragEnd={(_, info) => {
        const el = containerRef.current;
        if (!el) return;
        const cw = el.clientWidth || 1;
        const ch = el.clientHeight || 1;
        onMove(
          rect.id,
          clampJarvisRect({
            ...rect,
            x: rect.x + (info.offset.x / cw) * 100,
            y: rect.y + (info.offset.y / ch) * 100,
          }),
        );
      }}
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay: index * 0.06 }}
    >
      <motion.div
        className={cn("w-full", flowContent ? "h-auto" : "h-full")}
        animate={undefined}
        style={{ y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div
          className={cn("w-full", flowContent ? "h-auto" : "h-full")}
          onPointerDown={(e) => {
            const target = e.target as HTMLElement;
            if (
              target.closest("button") ||
              target.closest("input") ||
              target.closest(".recharts-wrapper")
            ) {
              return;
            }
            dragControls.start(e);
          }}
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function KpiValue({
  value,
  loading,
  className,
  size = "lg",
}: {
  value: number;
  loading?: boolean;
  className?: string;
  size?: "lg" | "md" | "sm";
}) {
  const sizeClass =
    size === "sm"
      ? "text-xl sm:text-2xl"
      : size === "md"
        ? "text-2xl sm:text-3xl"
        : "text-3xl sm:text-4xl";
  return (
    <p
      className={cn(
        "font-mono font-bold tabular-nums leading-none text-white",
        sizeClass,
        loading && "animate-pulse opacity-60",
        className,
      )}
    >
      {loading ? "—" : value.toLocaleString("id-ID")}
    </p>
  );
}

function JarvisModeDraggableCanvasInner({
  rows,
  stats,
  filtered,
  pasienOptions = [],
  loading,
  compact,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<JarvisWidgetRect[]>(
    DEFAULT_JARVIS_WIDGET_LAYOUT,
  );
  const [ppciPeriod, setPpciPeriod] = useState<
    "harian" | "mingguan" | "bulanan"
  >("harian");

  useEffect(() => {
    setLayout(loadJarvisWidgetLayout());
  }, []);

  const canvasHeight = useMemo(
    () => computeJarvisCanvasHeightPx(layout),
    [layout],
  );

  const onMove = useCallback((id: JarvisWidgetId, next: JarvisWidgetRect) => {
    setLayout((prev) => {
      const updated = prev.map((w) => (w.id === id ? next : w));
      saveJarvisWidgetLayout(updated);
      return updated;
    });
  }, []);

  const todayPatients = useMemo(() => computeTodayPatients(rows), [rows]);
  const activeDoctors = useMemo(() => computeActiveDoctors(rows), [rows]);
  const criticalAlerts = useMemo(() => computeCriticalAlerts(rows), [rows]);
  const ppciDaily = useMemo(
    () => computePpciTrendSeries(rows, "harian"),
    [rows],
  );
  const ppciWeekly = useMemo(
    () => computePpciTrendSeries(rows, "mingguan"),
    [rows],
  );
  const ppciMonthly = useMemo(
    () => computePpciTrendSeries(rows, "bulanan"),
    [rows],
  );

  const totalPasien = stats["Total pasien"] ?? 0;
  const pasienHariIni = stats["Pasien hari ini"] ?? todayPatients.length;
  const totalTindakan = stats["Total tindakan"] ?? 0;
  const totalDokter = stats["Total dokter"] ?? activeDoctors.length;
  const laporanMapped = stats["Laporan Terpetakan"] ?? 0;
  const gender = filtered?.gender ?? {
    laki: todayPatients.filter((p) => p.jenis_kelamin === "L").length,
    perempuan: todayPatients.filter((p) => p.jenis_kelamin === "P").length,
  };

  const renderWidget = (id: JarvisWidgetId): ReactNode => {
    switch (id) {
      case "kpi-pasien":
        return (
          <JarvisModeGlassPanel title="KPI Total Pasien" kpi>
            <div className="flex h-full min-h-0 flex-col justify-between gap-1">
              <KpiValue value={totalPasien} loading={loading} size="md" />
              <p className="text-[9px] leading-tight text-white/75 dark:text-white/90">
                Hari ini:{" "}
                <span className="font-mono font-semibold text-cyan-200">
                  {loading ? "—" : pasienHariIni}
                </span>
              </p>
            </div>
          </JarvisModeGlassPanel>
        );
      case "kpi-gender":
        return (
          <JarvisModeGlassPanel title="Total Gender Hari Ini" kpi>
            <div className="flex h-full min-h-0 flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Mars className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                  <KpiValue
                    value={gender.laki}
                    loading={loading}
                    size="sm"
                    className="text-cyan-300"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Venus className="h-3.5 w-3.5 shrink-0 text-pink-400" />
                  <KpiValue
                    value={gender.perempuan}
                    loading={loading}
                    size="sm"
                    className="text-pink-300"
                  />
                </div>
              </div>
              <ul className="min-h-0 flex-1 space-y-0.5">
                {todayPatients.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start gap-1 text-[9px] leading-tight text-white/85 dark:text-white/90"
                  >
                    {p.jenis_kelamin === "L" ? (
                      <Mars className="mt-0.5 h-2.5 w-2.5 shrink-0 text-cyan-400" />
                    ) : p.jenis_kelamin === "P" ? (
                      <Venus className="mt-0.5 h-2.5 w-2.5 shrink-0 text-pink-400" />
                    ) : (
                      <span className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                    )}
                    <span className="line-clamp-2 break-words">{p.nama}</span>
                  </li>
                ))}
              </ul>
            </div>
          </JarvisModeGlassPanel>
        );
      case "kpi-tindakan":
        return (
          <JarvisModeGlassPanel title="Total Tindakan Hari Ini" kpi>
            <div className="flex h-full min-h-0 flex-col gap-1">
              <KpiValue value={totalTindakan} loading={loading} size="md" />
              <ul className="min-h-0 flex-1 space-y-0.5">
                {(filtered?.tindakanBreakdown ?? []).map((line) => (
                  <li
                    key={line}
                    className="font-mono text-[9px] leading-tight text-white/80 dark:text-white/90"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </JarvisModeGlassPanel>
        );
      case "kpi-dokter":
        return (
          <JarvisModeGlassPanel title="Total Dokter Aktif" kpi>
            <div className="flex h-full min-h-0 flex-col gap-1">
              <KpiValue value={totalDokter} loading={loading} size="md" />
              <ul className="min-h-0 flex-1 space-y-1">
                {activeDoctors.map((d) => (
                  <li key={d.nama} className="text-[9px] leading-tight">
                    <p className="line-clamp-2 break-words text-white dark:text-white">
                      {d.nama}
                    </p>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-emerald-300">
                      <span className="h-1 w-1 rounded-full bg-emerald-400" />
                      Active
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </JarvisModeGlassPanel>
        );
      case "kpi-laporan":
        return (
          <JarvisModeGlassPanel title="Laporan Terpetakan" kpi accent="neutral">
            <div className="flex h-full min-h-0 flex-col justify-between gap-1">
              <KpiValue value={laporanMapped} loading={loading} size="md" />
              <p className="text-[9px] leading-tight text-white/75 dark:text-white/90">
                Dokumen PCI · Google Sheets / Drive
              </p>
            </div>
          </JarvisModeGlassPanel>
        );
      case "chart-ppci":
        return (
          <JarvisModePpciChart
            daily={ppciDaily}
            weekly={ppciWeekly}
            monthly={ppciMonthly}
            period={ppciPeriod}
            onPeriodChange={setPpciPeriod}
          />
        );
      case "laporan-tindakan":
        return (
          <JarvisModeLaporanTindakan
            rows={rows}
            pasienOptions={pasienOptions}
            loading={loading}
          />
        );
      case "alerts-medis":
        return (
          <JarvisModeGlassPanel
            title="Peringatan Medis"
            accent={criticalAlerts.length > 0 ? "rose" : "cyan"}
            compact
          >
            {criticalAlerts.length === 0 ? (
              <p className="text-xs text-white/85 dark:text-white/90">
                Tidak ada status kritis atau PPCI aktif hari ini.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {criticalAlerts.map((a) => (
                  <li
                    key={a.id}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-[10px]",
                      a.severity === "ppci" &&
                        "border-amber-400/40 bg-amber-500/10",
                      a.severity === "kritis" &&
                        "border-rose-400/40 bg-rose-500/10",
                    )}
                  >
                    <span className="font-bold uppercase text-white">
                      {a.label}
                    </span>
                    <p className="truncate text-white/90">{a.detail}</p>
                  </li>
                ))}
              </ul>
            )}
            <AlertTriangle className="pointer-events-none absolute bottom-3 right-3 h-7 w-7 text-rose-400/20" />
          </JarvisModeGlassPanel>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative pb-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80 dark:text-white/85">
          Seret panel · gulir konsol untuk laporan lengkap
        </p>
        <button
          type="button"
          onClick={() => setLayout(resetJarvisWidgetLayout())}
          className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-[10px] uppercase tracking-wide text-white/80 transition hover:border-cyan-400/40 hover:text-white"
        >
          Reset layout
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative overflow-x-hidden overflow-y-visible rounded-xl border border-cyan-500/15 bg-black/25"
        style={{
          minHeight: canvasHeight,
          height: canvasHeight,
          paddingBottom: 16,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,224,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,224,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />
        {layout.map((rect, i) => (
          <DraggableWidget
            key={rect.id}
            rect={rect}
            index={i}
            containerRef={containerRef}
            onMove={onMove}
          >
            {renderWidget(rect.id)}
          </DraggableWidget>
        ))}
      </div>
    </div>
  );
}

export default memo(JarvisModeDraggableCanvasInner);

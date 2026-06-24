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
  DEFAULT_JARVIS_WIDGET_LAYOUT,
  JARVIS_LAPORAN_ANCHOR_BOTTOM,
  loadJarvisWidgetLayout,
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

  const anchorBottom =
    rect.id === "laporan-tindakan" && JARVIS_LAPORAN_ANCHOR_BOTTOM;

  return (
    <motion.div
      className="absolute touch-none"
      style={{
        left: `${rect.x}%`,
        width: `${rect.w}%`,
        padding: 2,
        ...(anchorBottom
          ? { top: `${rect.y}%`, bottom: 0 }
          : { top: `${rect.y}%`, height: `${rect.h}%` }),
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
        className="h-full w-full"
        animate={undefined}
        style={{ y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div
          className="h-full w-full"
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
      ? "text-base sm:text-lg"
      : size === "md"
        ? "text-lg sm:text-xl"
        : "text-2xl sm:text-3xl";
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
          <JarvisModeGlassPanel title="Pasien" kpi>
            <div className="flex h-full min-h-0 flex-col justify-between gap-0.5">
              <KpiValue value={totalPasien} loading={loading} size="sm" />
              <p className="text-[8px] text-white/75 dark:text-white/90">
                Hari ini{" "}
                <span className="font-mono font-semibold text-cyan-200">
                  {loading ? "—" : pasienHariIni}
                </span>
              </p>
            </div>
          </JarvisModeGlassPanel>
        );
      case "kpi-gender":
        return (
          <JarvisModeGlassPanel title="Gender" kpi>
            <div className="flex h-full min-h-0 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <Mars className="h-3 w-3 shrink-0 text-cyan-400" />
                  <KpiValue
                    value={gender.laki}
                    loading={loading}
                    size="sm"
                    className="text-base text-cyan-300"
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <Venus className="h-3 w-3 shrink-0 text-pink-400" />
                  <KpiValue
                    value={gender.perempuan}
                    loading={loading}
                    size="sm"
                    className="text-base text-pink-300"
                  />
                </div>
              </div>
              <ul className="min-h-0 flex-1 space-y-0">
                {todayPatients.slice(0, 3).map((p) => (
                  <li
                    key={p.id}
                    className="truncate text-[8px] leading-tight text-white/85 dark:text-white/90"
                  >
                    {p.nama}
                  </li>
                ))}
              </ul>
            </div>
          </JarvisModeGlassPanel>
        );
      case "kpi-tindakan":
        return (
          <JarvisModeGlassPanel title="Tindakan" kpi>
            <div className="flex h-full min-h-0 flex-col gap-0.5">
              <KpiValue value={totalTindakan} loading={loading} size="sm" />
              <ul className="min-h-0 flex-1 space-y-0">
                {(filtered?.tindakanBreakdown ?? []).slice(0, 3).map((line) => (
                  <li
                    key={line}
                    className="truncate font-mono text-[8px] leading-tight text-white/80 dark:text-white/90"
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
          <JarvisModeGlassPanel title="Dokter" kpi>
            <div className="flex h-full min-h-0 flex-col gap-0.5">
              <KpiValue value={totalDokter} loading={loading} size="sm" />
              <ul className="min-h-0 flex-1 space-y-0">
                {activeDoctors.slice(0, 2).map((d) => (
                  <li
                    key={d.nama}
                    className="truncate text-[8px] leading-tight text-white dark:text-white"
                  >
                    {d.nama}
                  </li>
                ))}
              </ul>
            </div>
          </JarvisModeGlassPanel>
        );
      case "kpi-laporan":
        return (
          <JarvisModeGlassPanel title="PCI Map" kpi accent="neutral">
            <div className="flex h-full min-h-0 flex-col justify-center">
              <KpiValue value={laporanMapped} loading={loading} size="sm" />
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
            compact
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
    <div className="relative h-full min-h-0">
      <div
        ref={containerRef}
        className="relative h-full min-h-0 overflow-hidden rounded-lg border border-cyan-500/15 bg-black/25"
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

"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, Layers3, Stethoscope, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  displayRm,
  resolveJenisKelaminFromRow,
} from "../lib/displayTindakanRow";
import { rowTanggalToYmd } from "../lib/filterTindakanDashboardRows";

const TOP_N = 8;

function topCounts(
  rows: readonly TindakanJoinResult[],
  labelOf: (r: TindakanJoinResult) => string,
  n = TOP_N,
): { name: string; jumlah: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const raw = labelOf(r).trim();
    const label = raw || "(Tanpa label)";
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, jumlah]) => ({ name, jumlah }));
}

function useDashboardStats(rows: readonly TindakanJoinResult[]) {
  return useMemo(() => {
    const rmSet = new Set<string>();
    const daySet = new Set<string>();
    let jkL = 0;
    let jkP = 0;
    let jkOther = 0;
    const tindakanSet = new Set<string>();

    for (const row of rows) {
      const raw = row as unknown as Record<string, unknown>;
      const ymd = rowTanggalToYmd(row.tanggal);
      if (ymd) daySet.add(ymd);
      const rm = displayRm(raw);
      if (rm && rm !== "—") rmSet.add(rm);
      const td = String(row.tindakan ?? "").trim();
      if (td) tindakanSet.add(td);

      const jk = resolveJenisKelaminFromRow(raw, null);
      if (jk === "L") jkL += 1;
      else if (jk === "P") jkP += 1;
      else jkOther += 1;
    }

    return {
      total: rows.length,
      uniquePatients: rmSet.size,
      uniqueDays: daySet.size,
      distinctTindakan: tindakanSet.size,
      byTindakan: topCounts(rows, (r) => String(r.tindakan ?? "")),
      byDokter: topCounts(rows, (r) => String(r.dokter ?? "")),
      byKategori: topCounts(rows, (r) => String(r.kategori ?? "")),
      jk: [
        { name: "Laki-laki", jumlah: jkL },
        { name: "Perempuan", jumlah: jkP },
        ...(jkOther > 0 ? [{ name: "Lainnya / —", jumlah: jkOther }] : []),
      ].filter((d) => d.jumlah > 0),
    };
  }, [rows]);
}

function chartPalette(themeTone: "cyan" | "emerald", isDark: boolean) {
  if (themeTone === "emerald") {
    return {
      axis: isDark ? "#6ee7b7" : "#047857",
      grid: isDark ? "#064e3b" : "#d1fae5",
      fill: isDark ? "#34d399" : "#059669",
      tooltipBg: isDark ? "#022c22" : "#ecfdf5",
      tooltipBorder: isDark ? "#065f46" : "#6ee7b7",
      label: isDark ? "#a7f3d0" : "#064e3b",
    };
  }
  return {
    axis: isDark ? "#67e8f9" : "#0e7490",
    grid: isDark ? "#164e63" : "#cffafe",
    fill: isDark ? "#22d3ee" : "#0891b2",
    tooltipBg: isDark ? "#083344" : "#ecfeff",
    tooltipBorder: isDark ? "#155e75" : "#22d3ee",
    label: isDark ? "#a5f3fc" : "#164e63",
  };
}

function StatMiniCard({
  icon: Icon,
  label,
  value,
  isDark,
  themeTone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  isDark: boolean;
  themeTone: "cyan" | "emerald";
}) {
  const accent =
    themeTone === "emerald"
      ? isDark
        ? "border-emerald-800/50 bg-gradient-to-br from-emerald-950/60 to-black/30 text-emerald-50"
        : "border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-white text-emerald-900"
      : isDark
        ? "border-cyan-800/50 bg-gradient-to-br from-cyan-950/60 to-black/30 text-cyan-50"
        : "border-cyan-200/90 bg-gradient-to-br from-cyan-50 to-white text-cyan-950";

  const iconWrap =
    themeTone === "emerald"
      ? isDark
        ? "border-emerald-700/40 bg-emerald-950/50 text-emerald-300"
        : "border-emerald-300/60 bg-emerald-100 text-emerald-800"
      : isDark
        ? "border-cyan-700/40 bg-cyan-950/50 text-cyan-300"
        : "border-cyan-300/60 bg-cyan-100 text-cyan-800";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 basis-[8.5rem] items-center gap-2 rounded-xl border px-3 py-2.5 shadow-sm",
        accent,
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
          iconWrap,
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-wide",
            isDark ? "text-cyan-200/70" : "opacity-80",
          )}
        >
          {label}
        </p>
        <p className="text-lg font-extrabold tabular-nums leading-tight">
          {value.toLocaleString("id-ID")}
        </p>
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  data,
  isDark,
  themeTone,
  layout,
}: {
  title: string;
  data: { name: string; jumlah: number }[];
  isDark: boolean;
  themeTone: "cyan" | "emerald";
  layout: "horizontal" | "vertical";
}) {
  const c = chartPalette(themeTone, isDark);
  const border = isDark ? "border-cyan-800/45" : "border-slate-200/90";
  const bg = isDark ? "bg-black/35" : "bg-white/90";

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[200px] flex-col rounded-xl border p-3",
          border,
          bg,
        )}
      >
        <h3
          className={cn(
            "mb-2 text-sm font-bold",
            isDark ? "text-cyan-100" : "text-slate-800",
          )}
        >
          {title}
        </h3>
        <div
          className={cn(
            "flex flex-1 items-center justify-center rounded-lg text-xs",
            isDark ? "text-cyan-200/55" : "text-slate-500",
          )}
        >
          Tidak ada data untuk grafik ini.
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-[240px] flex-col rounded-xl border p-3", border, bg)}>
      <h3
        className={cn(
          "mb-1 shrink-0 text-sm font-bold",
          isDark ? "text-cyan-100" : "text-slate-800",
        )}
      >
        {title}
      </h3>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height={220}>
          {layout === "horizontal" ? (
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
            >
              <XAxis type="number" stroke={c.axis} tick={{ fill: c.label, fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={108}
                stroke={c.axis}
                tick={{ fill: c.label, fontSize: 10 }}
                interval={0}
              />
              <Tooltip
                cursor={{
                  fill: isDark
                    ? "rgba(34,211,238,0.06)"
                    : "rgba(8,145,178,0.06)",
                }}
                contentStyle={{
                  backgroundColor: c.tooltipBg,
                  border: `1px solid ${c.tooltipBorder}`,
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: c.label }}
              />
              <Bar dataKey="jumlah" fill={c.fill} radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="name"
                stroke={c.axis}
                tick={{ fill: c.label, fontSize: 10 }}
                interval={0}
                angle={data.length > 4 ? -28 : 0}
                textAnchor={data.length > 4 ? "end" : "middle"}
                height={data.length > 4 ? 64 : 32}
              />
              <YAxis stroke={c.axis} tick={{ fill: c.label, fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                cursor={{
                  fill: isDark
                    ? "rgba(34,211,238,0.06)"
                    : "rgba(8,145,178,0.06)",
                }}
                contentStyle={{
                  backgroundColor: c.tooltipBg,
                  border: `1px solid ${c.tooltipBorder}`,
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: c.label }}
              />
              <Bar dataKey="jumlah" fill={c.fill} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function TindakanDashboardSummaryCharts({
  rows,
  themeTone,
}: {
  rows: readonly TindakanJoinResult[];
  themeTone: "cyan" | "emerald";
}) {
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const stats = useDashboardStats(rows);

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[220px] flex-1 flex-col items-center justify-center rounded-xl border px-4 py-12 text-center text-sm",
          isDark
            ? "border-cyan-800/40 bg-black/25 text-cyan-200/65"
            : "border-slate-200 bg-slate-50 text-slate-600",
        )}
      >
        Tidak ada baris yang cocok dengan filter. Sesuaikan filter untuk melihat ringkasan.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <StatMiniCard
          icon={Layers3}
          label="Total tindakan"
          value={stats.total}
          isDark={isDark}
          themeTone={themeTone}
        />
        <StatMiniCard
          icon={Users}
          label="Pasien (RM unik)"
          value={stats.uniquePatients}
          isDark={isDark}
          themeTone={themeTone}
        />
        <StatMiniCard
          icon={CalendarDays}
          label="Hari tindakan"
          value={stats.uniqueDays}
          isDark={isDark}
          themeTone={themeTone}
        />
        <StatMiniCard
          icon={Stethoscope}
          label="Jenis tindakan"
          value={stats.distinctTindakan}
          isDark={isDark}
          themeTone={themeTone}
        />
      </div>

      <div className="grid min-h-0 gap-3 lg:grid-cols-2">
        <ChartPanel
          title="Tindakan (teratas)"
          data={stats.byTindakan}
          isDark={isDark}
          themeTone={themeTone}
          layout="horizontal"
        />
        <ChartPanel
          title="Dokter (teratas)"
          data={stats.byDokter}
          isDark={isDark}
          themeTone={themeTone}
          layout="horizontal"
        />
      </div>

      <div className="grid min-h-0 gap-3 lg:grid-cols-2">
        <ChartPanel
          title="Kategori"
          data={stats.byKategori}
          isDark={isDark}
          themeTone={themeTone}
          layout="vertical"
        />
        <ChartPanel
          title="Jenis kelamin"
          data={stats.jk}
          isDark={isDark}
          themeTone={themeTone}
          layout="vertical"
        />
      </div>

      <p
        className={cn(
          "text-center text-[11px]",
          isDark ? "text-cyan-200/60" : "text-slate-500",
        )}
      >
        Ringkasan dari {stats.total.toLocaleString("id-ID")} baris sesuai filter (top {TOP_N}{" "}
        per grafik batang).
      </p>
    </div>
  );
}

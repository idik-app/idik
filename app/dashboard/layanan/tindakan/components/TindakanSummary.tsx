import { Activity, CalendarDays, Layers3 } from "lucide-react";

type SummaryProps = {
  stats: Record<string, number>;
  loading: boolean;
  themeTone: "cyan" | "emerald";
};

type SummaryItem = {
  label: string;
  value: number;
  icon: typeof CalendarDays;
  tone: string;
  iconWrap: string;
};

function pickItemStyle(
  label: string,
  themeTone: "cyan" | "emerald",
): Omit<SummaryItem, "label" | "value"> {
  const key = label.toLowerCase();
  if (key.includes("hari")) {
    return {
      icon: CalendarDays,
      tone:
        themeTone === "emerald"
          ? "from-emerald-950/50 to-black/20 border-emerald-800/40"
          : "from-cyan-950/50 to-black/20 border-cyan-800/40",
      iconWrap:
        themeTone === "emerald"
          ? "border-emerald-700/35 bg-emerald-950/40 text-emerald-300/90"
          : "border-cyan-700/35 bg-cyan-950/40 text-cyan-300/90",
    };
  }
  if (key.includes("total")) {
    return {
      icon: Layers3,
      tone: "from-violet-950/40 to-black/20 border-violet-800/35",
      iconWrap: "border-violet-700/35 bg-violet-950/35 text-violet-200/90",
    };
  }
  return {
    icon: Activity,
    tone:
      themeTone === "emerald"
        ? "from-emerald-950/50 to-black/20 border-emerald-800/40"
        : "from-cyan-950/50 to-black/20 border-cyan-800/40",
    iconWrap:
      themeTone === "emerald"
        ? "border-emerald-700/35 bg-emerald-950/40 text-emerald-300/90"
        : "border-cyan-700/35 bg-cyan-950/40 text-cyan-300/90",
  };
}

function sortStatEntries(entries: [string, number][]): [string, number][] {
  const rank = (label: string) => {
    const k = label.toLowerCase();
    if (k.includes("hari")) return 0;
    if (k.includes("total")) return 1;
    return 2;
  };
  return [...entries].sort(([a], [b]) => {
    const d = rank(a) - rank(b);
    return d !== 0 ? d : a.localeCompare(b, "id");
  });
}

export default function TindakanSummary({
  stats,
  loading,
  themeTone,
}: SummaryProps) {
  const entries = sortStatEntries(Object.entries(stats || {}));
  const cards: SummaryItem[] = entries.map(([label, rawValue]) => ({
    label,
    value: Number(rawValue || 0),
    ...pickItemStyle(label, themeTone),
  }));

  const skeletonCount = loading ? Math.max(2, entries.length || 2) : 0;

  return (
    <div className="flex flex-wrap items-stretch gap-2 sm:gap-2.5 min-w-0">
      {loading
        ? Array.from({ length: skeletonCount }, (_, idx) => (
            <div
              key={`loading-${idx}`}
              className="flex min-h-[2.75rem] min-w-[9rem] flex-1 basis-[10rem] items-center gap-2.5 rounded-lg border border-cyan-900/40 bg-black/30 px-2.5 py-2 sm:min-w-0 sm:flex-initial sm:basis-auto"
            >
              <div className="h-7 w-7 shrink-0 animate-pulse rounded-md bg-cyan-900/30" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-2.5 w-14 animate-pulse rounded bg-cyan-900/35" />
                <div className="h-5 w-10 animate-pulse rounded bg-cyan-900/35" />
              </div>
            </div>
          ))
        : cards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`flex min-w-0 flex-1 basis-[10rem] items-center gap-2.5 rounded-lg border bg-gradient-to-br px-2.5 py-2 shadow-sm shadow-black/25 transition hover:border-white/10 sm:flex-initial sm:basis-auto ${item.tone}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${item.iconWrap}`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-200/55">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-cyan-50 sm:text-xl">
                    {item.value.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            );
          })}
    </div>
  );
}

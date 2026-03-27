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
          ? "from-emerald-600/20 to-emerald-900/10 border-emerald-700/40"
          : "from-cyan-600/20 to-cyan-900/10 border-cyan-700/40",
    };
  }
  if (key.includes("total")) {
    return {
      icon: Layers3,
      tone: "from-violet-600/20 to-violet-900/10 border-violet-700/40",
    };
  }
  return {
    icon: Activity,
    tone: "from-emerald-600/20 to-emerald-900/10 border-emerald-700/40",
  };
}

export default function TindakanSummary({
  stats,
  loading,
  themeTone,
}: SummaryProps) {
  const entries = Object.entries(stats || {});
  const cards: SummaryItem[] = entries.map(([label, rawValue]) => ({
    label,
    value: Number(rawValue || 0),
    ...pickItemStyle(label, themeTone),
  }));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {loading
        ? [0, 1, 2].map((idx) => (
            <div
              key={`loading-${idx}`}
              className="rounded-xl border border-cyan-900/40 bg-black/35 p-4"
            >
              <div className="h-4 w-20 animate-pulse rounded bg-cyan-900/35" />
              <div className="mt-4 h-8 w-16 animate-pulse rounded bg-cyan-900/35" />
            </div>
          ))
        : cards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`rounded-xl border bg-gradient-to-br p-4 shadow-lg shadow-black/20 transition-transform duration-200 hover:-translate-y-0.5 ${item.tone}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-cyan-200/70">
                      {item.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-cyan-50">
                      {item.value.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/30 p-2.5 text-cyan-200/90">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
    </div>
  );
}

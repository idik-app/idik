"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { format, isValid, parse } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "@/lib/utils";

const DT_LOCAL = "yyyy-MM-dd'T'HH:mm" as const;

function parseDateTimeLocal(s: string): Date | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const d = parse(t, DT_LOCAL, new Date());
  return isValid(d) ? d : undefined;
}

function toDateTimeLocalString(d: Date): string {
  return format(d, DT_LOCAL);
}

const rdpTheme = {
  "--rdp-accent-color": "rgb(232 197 71)",
  "--rdp-accent-background-color": "rgba(232, 197, 71, 0.12)",
  "--rdp-today-color": "rgb(45 212 191)",
  "--rdp-day-height": "2.25rem",
  "--rdp-day-width": "2.25rem",
  "--rdp-day_button-height": "2.125rem",
  "--rdp-day_button-width": "2.125rem",
} as const satisfies Record<string, string>;

export function DatetimeLocalPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (isoLike: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [navMonth, setNavMonth] = useState<Date>(() => new Date());
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = parseDateTimeLocal(value);
  const calendarDay = selected ?? new Date();

  useEffect(() => {
    if (!open) return;
    setNavMonth(parseDateTimeLocal(value) ?? new Date());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function applyTime(hh: number, mm: number) {
    let base = parseDateTimeLocal(value);
    if (!base) base = new Date();
    base.setHours(hh, mm, 0, 0);
    onChange(toDateTimeLocalString(base));
  }

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <button
        suppressHydrationWarning
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-left text-[11px] text-white hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40"
      >
        <Calendar className="h-3.5 w-3.5 shrink-0 text-[#E8C547]/90" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {selected
            ? format(selected, "EEEE, d MMM yyyy · HH:mm", { locale: idLocale })
            : "Pilih tanggal & jam…"}
        </span>
      </button>
      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-[60] mt-1 rounded-xl border border-white/15 bg-[#0a1628]/98 p-2 shadow-2xl backdrop-blur-sm sm:right-auto sm:min-w-[min(100%,18rem)]"
          role="dialog"
          aria-label="Kalender tanggal dan jam"
        >
          <DayPicker
            mode="single"
            selected={selected}
            month={navMonth}
            onMonthChange={setNavMonth}
            onSelect={(d) => {
              if (!d) return;
              const src = parseDateTimeLocal(value) ?? new Date();
              d.setHours(src.getHours(), src.getMinutes(), 0, 0);
              onChange(toDateTimeLocalString(d));
            }}
            locale={idLocale}
            className="rdp-root text-white text-[12px]"
            style={rdpTheme as unknown as CSSProperties}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
            <span className="text-[10px] text-white/50 shrink-0">Jam</span>
            <input
              type="time"
              value={format(calendarDay, "HH:mm")}
              step={60}
              onChange={(e) => {
                const v = e.target.value;
                if (!v || !/^\d{2}:\d{2}$/.test(v)) return;
                const [hs, ms] = v.split(":");
                const hh = Number(hs);
                const mm = Number(ms);
                if (Number.isNaN(hh) || Number.isNaN(mm)) return;
                applyTime(hh, mm);
              }}
              className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50 [color-scheme:dark]"
            />
            <button
              type="button"
              onClick={() => {
                const n = new Date();
                let base = parseDateTimeLocal(value);
                if (!base) base = n;
                base.setFullYear(n.getFullYear(), n.getMonth(), n.getDate());
                onChange(toDateTimeLocalString(base));
              }}
              className="shrink-0 rounded-md border border-white/20 px-2 py-1 text-[10px] text-white/80 hover:bg-white/5"
            >
              Hari ini
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "@/lib/utils";

function parseYmd(s: string): Date | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  const dt = new Date(y, mo - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return undefined;
  }
  return dt;
}

function toYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

const rdpTheme = {
  "--rdp-accent-color": "rgb(34 211 238)",
  "--rdp-accent-background-color": "rgba(8, 51, 68, 0.55)",
  "--rdp-today-color": "rgb(251 191 36)",
  "--rdp-day-height": "2.25rem",
  "--rdp-day-width": "2.25rem",
  "--rdp-day_button-height": "2.125rem",
  "--rdp-day_button-width": "2.125rem",
} as const satisfies Record<string, string>;

export function DateYmdPicker({
  label,
  value,
  onChange,
  className,
  clearable = true,
}: {
  label: string;
  value: string;
  onChange: (ymd: string) => void;
  className?: string;
  /** false = wajib ada tanggal (filter laporan, dll.) */
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = parseYmd(value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
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

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <span className="flex flex-col gap-0.5 text-[11px] text-cyan-400/90">
        {label}
        <span className="flex items-stretch gap-0.5">
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex min-w-[11rem] flex-1 items-center gap-1.5 rounded-md border border-cyan-800/70 bg-slate-950/70 px-2 py-1.5 text-left text-[12px] text-cyan-100 hover:border-cyan-600/60"
          >
            <Calendar className="h-3.5 w-3.5 shrink-0 text-cyan-400/90" />
            <span className="min-w-0 truncate">
              {selected
                ? format(selected, "d MMMM yyyy", { locale: idLocale })
                : "Pilih tanggal…"}
            </span>
          </button>
          {clearable && selected ? (
            <button
              suppressHydrationWarning
              type="button"
              title="Hapus tanggal"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setOpen(false);
              }}
              className="shrink-0 rounded-md border border-cyan-900/60 px-2 text-[11px] text-cyan-400/80 hover:bg-cyan-950/50"
            >
              ×
            </button>
          ) : null}
        </span>
      </span>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 rounded-xl border border-cyan-800/70 bg-slate-950/98 p-2 shadow-xl backdrop-blur-sm"
          role="dialog"
          aria-label={label}
        >
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected ?? new Date()}
            onSelect={(d) => {
              onChange(d ? toYmd(d) : "");
              setOpen(false);
            }}
            locale={idLocale}
            className="rdp-root text-cyan-100"
            style={rdpTheme as unknown as CSSProperties}
          />
        </div>
      ) : null}
    </div>
  );
}

"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { format, isValid, parse } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

const YMD = "yyyy-MM-dd" as const;

function parseYmd(s: string): Date | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const d = parse(t, YMD, new Date());
  return isValid(d) ? d : undefined;
}

function toYmd(d: Date): string {
  return format(d, YMD);
}

const rdpLight = {
  "--rdp-accent-color": "rgb(8 145 178)",
  "--rdp-accent-background-color": "rgba(8, 145, 178, 0.12)",
  "--rdp-today-color": "rgb(13 148 136)",
  "--rdp-day-height": "2.5rem",
  "--rdp-day-width": "2.5rem",
  "--rdp-day_button-height": "2.5rem",
  "--rdp-day_button-width": "2.5rem",
} as const satisfies Record<string, string>;

const rdpDark = {
  "--rdp-accent-color": "rgb(34 211 238)",
  "--rdp-accent-background-color": "rgba(34, 211, 238, 0.15)",
  "--rdp-today-color": "rgb(250 204 21)",
  "--rdp-day-height": "2.5rem",
  "--rdp-day-width": "2.5rem",
  "--rdp-day_button-height": "2.5rem",
  "--rdp-day_button-width": "2.5rem",
} as const satisfies Record<string, string>;

const displayFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Tetap diekspor agar pemanggil lama tidak rusak; kalender tidak lagi di-portal ke body. */
export const DATE_YMD_PICKER_PORTAL = "data-date-ymd-picker-portal" as const;

/**
 * Pemilih tanggal `yyyy-MM-dd` — panel **di dalam pohon DOM** (bukan portal body)
 * supaya selalu di atas input lain di modal dan klik di luar menutup tanpa “tembus”.
 */
export function DateYmdPicker({
  id,
  value,
  onChange,
  placeholder = "Pilih tanggal",
  className,
  buttonClassName,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (ymd: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const [open, setOpen] = useState(false);
  const [navMonth, setNavMonth] = useState<Date>(() => new Date());
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = parseYmd(value);
  const yearNow = new Date().getFullYear();

  useEffect(() => {
    if (!open) return;
    setNavMonth(parseYmd(value) ?? new Date());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label =
    selected && isValid(selected)
      ? displayFmt.format(selected)
      : placeholder;

  return (
    <div
      ref={wrapRef}
      {...{ [DATE_YMD_PICKER_PORTAL]: "" }}
      className={cn(
        "relative min-w-0",
        open && "z-[300]",
        className,
      )}
    >
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full min-w-0 items-center gap-2 rounded-md border px-2.5 text-left text-xs transition outline-none focus-visible:ring-2",
          "border-slate-300/80 bg-white text-slate-900 focus-visible:ring-cyan-500/35 dark:border-cyan-700/50 dark:bg-black/40 dark:text-cyan-50 dark:focus-visible:ring-cyan-400/30",
          !value && "text-slate-500 dark:text-cyan-200/55",
          disabled && "cursor-not-allowed opacity-50",
          buttonClassName,
        )}
      >
        <Calendar
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            "text-cyan-700 dark:text-cyan-400",
          )}
        />
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 top-full z-[301] mt-1 w-[min(calc(100vw-2rem),320px)] max-w-[min(100vw-2rem,320px)] rounded-xl border p-3 shadow-2xl",
            "border-slate-200/90 bg-white text-slate-900 dark:border-cyan-700/50 dark:bg-slate-950 dark:text-cyan-50",
          )}
          aria-label="Kalender pilih tanggal"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className={cn(
              "[&_.rdp-month_grid]:table-fixed [&_.rdp-month_grid]:w-full",
              "[&_.rdp-day_button]:box-border [&_.rdp-day_button]:!min-h-[2.5rem] [&_.rdp-day_button]:!min-w-[2.5rem] [&_.rdp-day_button]:cursor-pointer",
            )}
          >
            <DayPicker
              mode="single"
              selected={selected}
              month={navMonth}
              onMonthChange={setNavMonth}
              onSelect={(d) => {
                if (!d) return;
                onChange(toYmd(d));
                queueMicrotask(() => setOpen(false));
              }}
              locale={idLocale}
              captionLayout="dropdown"
              fromYear={1990}
              toYear={yearNow + 5}
              className={cn(
                "rdp-root text-[12px]",
                "text-slate-900 dark:text-cyan-50",
              )}
              style={(isDark ? rdpDark : rdpLight) as unknown as CSSProperties}
            />
          </div>
          <div
            className={cn(
              "mt-2 flex justify-end border-t pt-2",
              "border-slate-200 dark:border-cyan-800/50",
            )}
          >
            <button
              type="button"
              className={cn(
                "cursor-pointer text-[11px] font-semibold underline-offset-2 hover:underline",
                "text-slate-600 dark:text-cyan-300/90",
              )}
              onClick={() => {
                onChange("");
                queueMicrotask(() => setOpen(false));
              }}
            >
              Hapus tanggal
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

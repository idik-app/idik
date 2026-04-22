"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { format, isValid, parse } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { UI_LAYERS } from "@/lib/ui/layers";

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

const rdpThemeDefault = {
  "--rdp-accent-color": "rgb(232 197 71)",
  "--rdp-accent-background-color": "rgba(232, 197, 71, 0.12)",
  "--rdp-today-color": "rgb(45 212 191)",
  "--rdp-day-height": "2.25rem",
  "--rdp-day-width": "2.25rem",
  "--rdp-day_button-height": "2.125rem",
  "--rdp-day_button-width": "2.125rem",
} as const satisfies Record<string, string>;

const rdpThemeDrawerDark = {
  ...rdpThemeDefault,
  "--rdp-accent-color": "rgb(34 211 238)",
  "--rdp-accent-background-color": "rgba(34, 211, 238, 0.15)",
  "--rdp-today-color": "rgb(250 204 21)",
} as const satisfies Record<string, string>;

const rdpThemeDrawerLight = {
  ...rdpThemeDefault,
  "--rdp-accent-color": "rgb(8 145 178)",
  "--rdp-accent-background-color": "rgba(8, 145, 178, 0.12)",
  "--rdp-today-color": "rgb(13 148 136)",
} as const satisfies Record<string, string>;

type Appearance = "default" | "drawer";

export function DatetimeLocalPicker({
  value,
  onChange,
  className,
  appearance = "default",
  /** Gabungkan ke tombol pemicu (mis. field abu gelap di drawer). */
  triggerClassName,
  triggerIconClassName,
}: {
  value: string;
  onChange: (isoLike: string) => void;
  className?: string;
  /** `drawer`: gaya selaras tab tindakan + panel diposisikan fixed (tidak terpotong scroll). */
  appearance?: Appearance;
  triggerClassName?: string;
  triggerIconClassName?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const [open, setOpen] = useState(false);
  const [navMonth, setNavMonth] = useState<Date>(() => new Date());
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [floatPos, setFloatPos] = useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 0, left: 0, width: 288 });

  const selected = parseDateTimeLocal(value);
  const calendarDay = selected ?? new Date();
  const [timeDraft, setTimeDraft] = useState(() => format(calendarDay, "HH:mm"));

  const isDrawer = appearance === "drawer";

  useEffect(() => {
    if (!open) return;
    setNavMonth(parseDateTimeLocal(value) ?? new Date());
  }, [open, value]);

  useEffect(() => {
    setTimeDraft(format(calendarDay, "HH:mm"));
  }, [value]);

  useLayoutEffect(() => {
    if (!open || !isDrawer || !buttonRef.current) return;
    const update = () => {
      const el = buttonRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setFloatPos({
        top: r.bottom + 6,
        left: r.left,
        width: Math.max(r.width, 288),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, isDrawer]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || portalRef.current?.contains(t)) return;
      setOpen(false);
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

  const rdpStyle =
    isDrawer && !isDark
      ? rdpThemeDrawerLight
      : isDrawer
        ? rdpThemeDrawerDark
        : rdpThemeDefault;

  const dayPickerClass = cn(
    "rdp-root text-[12px]",
    "text-slate-900 dark:text-white",
  );

  const panelInner = (
    <>
      <div
        className={cn(
          "rounded-lg",
          isDrawer
            ? "bg-white dark:bg-[#0a1018]"
            : "bg-[#0a1628]",
        )}
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
          className={dayPickerClass}
          style={rdpStyle as unknown as CSSProperties}
        />
      </div>
      <div
        className={cn(
          "mt-2 flex flex-wrap items-center gap-2 border-t pt-2",
          isDrawer
            ? "border-cyan-200/80 dark:border-white/10"
            : "border-white/10",
        )}
      >
        <span
          className={cn(
            "text-[10px] shrink-0",
            "text-slate-500 dark:text-white/85",
          )}
        >
          Jam (24 jam)
        </span>
        {isDrawer ? (
          <input
            type="text"
            lang="id-ID"
            inputMode="numeric"
            value={timeDraft}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d:]/g, "").slice(0, 5);
              setTimeDraft(v);
              if (!/^\d{2}:\d{2}$/.test(v)) return;
              const [hs, ms] = v.split(":");
              const hh = Number(hs);
              const mm = Number(ms);
              if (Number.isNaN(hh) || Number.isNaN(mm)) return;
              if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return;
              applyTime(hh, mm);
            }}
            onBlur={() => {
              if (!/^\d{2}:\d{2}$/.test(timeDraft)) {
                setTimeDraft(format(calendarDay, "HH:mm"));
                return;
              }
              const [hs, ms] = timeDraft.split(":");
              const hh = Number(hs);
              const mm = Number(ms);
              if (Number.isNaN(hh) || Number.isNaN(mm)) {
                setTimeDraft(format(calendarDay, "HH:mm"));
                return;
              }
              if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
                setTimeDraft(format(calendarDay, "HH:mm"));
                return;
              }
              applyTime(hh, mm);
              setTimeDraft(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
            }}
            placeholder="HH:mm"
            className={cn(
              "min-w-0 flex-1 rounded-md border px-2 py-1 text-[11px] font-mono font-semibold focus:outline-none focus:ring-1",
              "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 focus:ring-cyan-500/40 dark:border-cyan-900/50 dark:bg-black/40 dark:text-white dark:placeholder:text-white/90 dark:focus:ring-cyan-500/35",
            )}
          />
        ) : (
          <input
            type="text"
            lang="id-ID"
            inputMode="numeric"
            value={timeDraft}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d:]/g, "").slice(0, 5);
              setTimeDraft(v);
              if (!/^\d{2}:\d{2}$/.test(v)) return;
              const [hs, ms] = v.split(":");
              const hh = Number(hs);
              const mm = Number(ms);
              if (Number.isNaN(hh) || Number.isNaN(mm)) return;
              if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return;
              applyTime(hh, mm);
            }}
            onBlur={() => {
              if (!/^\d{2}:\d{2}$/.test(timeDraft)) {
                setTimeDraft(format(calendarDay, "HH:mm"));
                return;
              }
              const [hs, ms] = timeDraft.split(":");
              const hh = Number(hs);
              const mm = Number(ms);
              if (Number.isNaN(hh) || Number.isNaN(mm)) {
                setTimeDraft(format(calendarDay, "HH:mm"));
                return;
              }
              if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
                setTimeDraft(format(calendarDay, "HH:mm"));
                return;
              }
              applyTime(hh, mm);
              setTimeDraft(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
            }}
            placeholder="HH:mm"
            className={cn(
              "min-w-0 flex-1 rounded-md border px-2 py-1 text-[11px] font-mono font-semibold focus:outline-none focus:ring-1",
              "border-white/15 bg-black/40 text-white placeholder:text-white/90 focus:ring-[#E8C547]/50",
            )}
          />
        )}
        <button
          type="button"
          onClick={() => {
            const n = new Date();
            let base = parseDateTimeLocal(value);
            if (!base) base = n;
            base.setFullYear(n.getFullYear(), n.getMonth(), n.getDate());
            onChange(toDateTimeLocalString(base));
          }}
          className={cn(
            "shrink-0 rounded-md border px-2 py-1 text-[10px]",
            isDrawer
              ? "border-cyan-400/40 text-cyan-900 hover:bg-cyan-50 dark:border-cyan-800/40 dark:text-cyan-200/90 dark:hover:bg-cyan-950/40"
              : "border-white/20 text-white/80 hover:bg-white/5",
          )}
        >
          Hari ini
        </button>
      </div>
    </>
  );

  const panelClass = cn(
    "rounded-xl border p-2 shadow-2xl",
    isDrawer
      ? isDark
        ? "border-cyan-800/50 bg-[#0a1018] text-white"
        : "border-cyan-300/70 bg-white text-slate-900"
      : "border-white/15 bg-[#0a1628] text-white",
  );

  const panel = isDrawer
    ? typeof document !== "undefined"
      ? createPortal(
          <div className={isDark ? "dark" : undefined}>
            <div
              ref={portalRef}
              className={cn(panelClass, UI_LAYERS.pickerFloating)}
              style={{
                position: "fixed",
                top: floatPos.top,
                left: floatPos.left,
                width: floatPos.width,
                maxHeight: "min(70vh, 420px)",
                overflowY: "auto",
              }}
              role="dialog"
              aria-label="Kalender tanggal dan jam"
              lang="id-ID"
            >
              {panelInner}
            </div>
          </div>,
          document.body,
        )
      : null
    : (
        <div
          ref={portalRef}
          className={cn(
            "absolute left-0 right-0 top-full mt-1 sm:right-auto sm:min-w-[min(100%,18rem)]",
            UI_LAYERS.popover,
            panelClass,
          )}
          role="dialog"
          aria-label="Kalender tanggal dan jam"
          lang="id-ID"
        >
          {panelInner}
        </div>
      );

  const buttonClass = cn(
    "w-full flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[12px] font-semibold focus:outline-none focus:ring-2",
    isDrawer
      ? "border-cyan-400/55 bg-white text-slate-950 hover:bg-cyan-50/80 focus:ring-cyan-500/35 dark:border-cyan-900/50 dark:bg-black/40 dark:text-white dark:hover:bg-black/55 dark:focus:ring-cyan-500/30"
      : "border-white/15 bg-black/40 text-white hover:bg-black/55 focus:ring-[#E8C547]/40",
    triggerClassName,
  );

  const iconClass = cn(
    "h-3.5 w-3.5 shrink-0",
    isDrawer ? "text-cyan-600 dark:text-white/90" : "text-[#E8C547]/90",
    triggerIconClassName,
  );

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)} lang="id-ID">
      <button
        ref={buttonRef}
        suppressHydrationWarning
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={buttonClass}
      >
        <Calendar className={iconClass} aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {selected
            ? format(selected, "EEEE, d MMM yyyy, HH:mm", { locale: idLocale })
            : "Pilih tanggal & jam…"}
        </span>
      </button>
      {open ? panel : null}
    </div>
  );
}

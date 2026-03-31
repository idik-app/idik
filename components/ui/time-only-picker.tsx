"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";

const HOUR_OPTS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTS = Array.from({ length: 60 }, (_, i) => i);

export function parseTimeHHMM(s: string): { h: number; m: number } | null {
  const t = s.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return { h, m: mi };
}

export function toHHMMString(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Dari `HH:mm`, ISO datetime, atau string kosong → `HH:mm` atau `""`. */
export function normalizeTimeOnlyInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const hm = parseTimeHHMM(t);
  if (hm) return toHHMMString(hm.h, hm.m);
  const d = Date.parse(t);
  if (Number.isFinite(d)) {
    const dt = new Date(d);
    return toHHMMString(dt.getHours(), dt.getMinutes());
  }
  return "";
}

type Appearance = "drawer";

/**
 * Pemilih jam 24 jam (tanpa tanggal). Nilai: `HH:mm` atau string kosong.
 * Gaya selaras `DatetimeLocalPicker` mode drawer (portal fixed).
 */
export function TimeOnlyPicker({
  value,
  onChange,
  className,
  appearance = "drawer",
}: {
  value: string;
  onChange: (hhmm: string) => void;
  className?: string;
  appearance?: Appearance;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [floatPos, setFloatPos] = useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 0, left: 0, width: 260 });

  const parsed = parseTimeHHMM(value);
  const h = parsed?.h ?? 0;
  const min = parsed?.m ?? 0;

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      const el = buttonRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setFloatPos({
        top: r.bottom + 6,
        left: r.left,
        width: Math.max(r.width, 260),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

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

  function apply(hh: number, mm: number) {
    onChange(toHHMMString(hh, mm));
  }

  const panelClass = cn(
    "rounded-xl border p-2 shadow-2xl",
    "border-cyan-300/70 bg-white text-slate-900 dark:border-cyan-800/50 dark:bg-[#0a1018]/98 dark:backdrop-blur-sm dark:text-white",
  );

  const panelInner = (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        "text-slate-900 dark:text-white",
      )}
      lang="id-ID"
    >
      <span
        className={cn(
          "text-[10px] shrink-0",
          "text-slate-500 dark:text-white/50",
        )}
      >
        Jam (24 jam)
      </span>
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1 font-mono text-[11px] font-semibold",
        )}
      >
        <select
          aria-label="Jam 0–23"
          value={h}
          onChange={(e) => {
            const hh = Number(e.target.value);
            if (Number.isNaN(hh)) return;
            apply(hh, min);
          }}
          className={cn(
            "min-w-0 flex-1 rounded-md border px-1.5 py-1 focus:outline-none focus:ring-1",
            "border-cyan-400/55 bg-white text-slate-950 focus:ring-cyan-500/40 dark:border-cyan-900/50 dark:bg-black/40 dark:text-cyan-100 dark:focus:ring-cyan-500/35",
          )}
        >
          {HOUR_OPTS.map((hour) => (
            <option key={hour} value={hour}>
              {String(hour).padStart(2, "0")}
            </option>
          ))}
        </select>
        <span className="text-slate-400 dark:text-cyan-500/60">:</span>
        <select
          aria-label="Menit 0–59"
          value={min}
          onChange={(e) => {
            const mm = Number(e.target.value);
            if (Number.isNaN(mm)) return;
            apply(h, mm);
          }}
          className={cn(
            "min-w-0 flex-1 rounded-md border px-1.5 py-1 focus:outline-none focus:ring-1",
            "border-cyan-400/55 bg-white text-slate-950 focus:ring-cyan-500/40 dark:border-cyan-900/50 dark:bg-black/40 dark:text-cyan-100 dark:focus:ring-cyan-500/35",
          )}
        >
          {MINUTE_OPTS.map((minute) => (
            <option key={minute} value={minute}>
              {String(minute).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => {
          const n = new Date();
          apply(n.getHours(), n.getMinutes());
        }}
        className={cn(
          "shrink-0 rounded-md border px-2 py-1 text-[10px]",
          "border-cyan-400/40 text-cyan-900 hover:bg-cyan-50 dark:border-cyan-800/40 dark:text-cyan-200/90 dark:hover:bg-cyan-950/40",
        )}
      >
        Sekarang
      </button>
    </div>
  );

  const panel =
    appearance === "drawer" && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={portalRef}
            className={cn(panelClass, "z-[10050]")}
            style={{
              position: "fixed",
              top: floatPos.top,
              left: floatPos.left,
              width: floatPos.width,
              maxHeight: "min(50vh, 280px)",
              overflowY: "auto",
            }}
            role="dialog"
            aria-label="Pilih jam"
            lang="id-ID"
          >
            {panelInner}
          </div>,
          document.body,
        )
      : null;

  const buttonClass = cn(
    "w-full flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[12px] font-semibold focus:outline-none focus:ring-2",
    "border-cyan-400/55 bg-white text-slate-950 hover:bg-cyan-50/80 focus:ring-cyan-500/35 dark:border-cyan-900/50 dark:bg-black/40 dark:text-cyan-100 dark:hover:bg-black/55 dark:focus:ring-cyan-500/30",
  );

  const iconClass = cn(
    "h-3.5 w-3.5 shrink-0",
    "text-cyan-600 dark:text-cyan-400/90",
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
        <Clock className={iconClass} aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {parsed ? toHHMMString(parsed.h, parsed.m) : "Pilih jam…"}
        </span>
      </button>
      {open ? panel : null}
    </div>
  );
}

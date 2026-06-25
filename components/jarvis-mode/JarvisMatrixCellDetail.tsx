"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { MonthlyMatrixAgg } from "@/app/dashboard/layanan/tindakan/lib/tindakanBulananMatrix";
import { UI_LAYERS } from "@/lib/ui/layers";
import { cn } from "@/lib/utils";

type PatientDetail = NonNullable<MonthlyMatrixAgg["details"]>[number][number][number];

type Props = {
  count: number;
  display: string;
  label: string;
  day: number;
  patients: PatientDetail[];
  className?: string;
};

function JarvisMatrixCellDetailInner({
  count,
  display,
  label,
  day,
  patients,
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const hasPatients = patients.length > 0;

  const updateAnchor = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2, 112), window.innerWidth - 112);
    const y = Math.max(r.top, 8);
    setAnchor({ x, y });
  }, []);

  const show = useCallback(() => {
    if (!hasPatients) return;
    updateAnchor();
    setOpen(true);
  }, [hasPatients, updateAnchor]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updateAnchor();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, updateAnchor]);

  if (count <= 0) {
    return <span className={className}>{display}</span>;
  }

  const tooltip =
    open && hasPatients && typeof document !== "undefined"
      ? createPortal(
          <div
            role="tooltip"
            className={cn(
              "pointer-events-none w-max max-w-[min(240px,calc(100vw-16px))] rounded-md border border-cyan-500/35",
              "bg-[#0a1520]/98 p-2 shadow-[0_8px_28px_rgba(0,0,0,0.6)] backdrop-blur-sm",
              UI_LAYERS.jarvisModePopover,
            )}
            style={{
              position: "fixed",
              left: anchor.x,
              top: anchor.y - 6,
              transform: "translate(-50%, -100%)",
              zIndex: 100_196,
            }}
          >
            <div className="mb-1 border-b border-cyan-500/25 pb-1 text-[9px] font-bold text-cyan-300">
              {label} · Tgl {day}
            </div>
            <ul className="max-h-36 overflow-y-auto text-[9px]">
              {patients.map((p, pi) => (
                <li
                  key={`${p.no_rm}-${pi}`}
                  className="border-b border-white/10 py-1 last:border-0"
                >
                  <div className="font-semibold text-white dark:text-white">
                    {p.nama}
                  </div>
                  <div className="text-white/80 dark:text-white/90">
                    {p.tindakan ? (
                      <span className="text-cyan-200/90">{p.tindakan}</span>
                    ) : null}
                    {p.tindakan ? " · " : ""}
                    RM {p.no_rm} · Dr {p.dokter}
                  </div>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        className={cn(
          "inline-block min-w-[1ch] rounded-sm",
          hasPatients &&
            "cursor-help underline decoration-cyan-400/40 decoration-dotted underline-offset-2 hover:bg-cyan-500/15",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60",
          className,
        )}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        title={
          hasPatients
            ? patients.map((p) => p.nama).join(", ")
            : `${count} tindakan`
        }
        aria-label={
          hasPatients
            ? `${count} pasien: ${patients.map((p) => p.nama).join(", ")}`
            : `${count} tindakan`
        }
      >
        {display}
      </span>
      {tooltip}
    </>
  );
}

export default memo(JarvisMatrixCellDetailInner);

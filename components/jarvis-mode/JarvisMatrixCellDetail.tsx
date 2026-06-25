"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { MonthlyMatrixAgg } from "@/app/dashboard/layanan/tindakan/lib/tindakanBulananMatrix";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";
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
  const ref = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, below: false });
  const hasPatients = patients.length > 0;
  const visible = hasPatients && (hovering || pinned);

  const updateAnchor = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2, 120), window.innerWidth - 120);
    const below = r.top < 96;
    const y = below ? r.bottom + 6 : r.top - 6;
    setAnchor({ x, y, below });
  }, []);

  const showHover = useCallback(() => {
    if (!hasPatients) return;
    updateAnchor();
    setHovering(true);
  }, [hasPatients, updateAnchor]);

  const hideHover = useCallback(() => {
    setHovering(false);
  }, []);

  const togglePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!hasPatients) return;
      updateAnchor();
      setPinned((p) => !p);
    },
    [hasPatients, updateAnchor],
  );

  useEffect(() => {
    if (!visible) return;
    const onScroll = () => updateAnchor();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [visible, updateAnchor]);

  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = ref.current;
      if (el?.contains(e.target as Node)) return;
      setPinned(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pinned]);

  if (count <= 0) {
    return <span className={className}>{display}</span>;
  }

  const tooltip =
    visible && typeof document !== "undefined"
      ? createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className={cn(
              "pointer-events-auto w-max max-w-[min(260px,calc(100vw-16px))] rounded-md border border-cyan-500/40",
              "bg-[#0a1520]/98 p-2 shadow-[0_8px_28px_rgba(0,0,0,0.65)] backdrop-blur-sm",
              UI_LAYERS.jarvisModePopover,
            )}
            style={{
              position: "fixed",
              left: anchor.x,
              top: anchor.y,
              transform: anchor.below
                ? "translate(-50%, 0)"
                : "translate(-50%, -100%)",
              zIndex: Z_INDEX_VALUES.jarvisModePopover,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="mb-1 border-b border-cyan-500/25 pb-1 text-[9px] font-bold text-cyan-300">
              {label} · Tgl {day}
            </div>
            <ul className="max-h-40 overflow-y-auto text-[9px]">
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
      <button
        ref={ref}
        type="button"
        data-jarvis-matrix-cell=""
        className={cn(
          "inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-sm px-0.5",
          hasPatients &&
            "cursor-pointer underline decoration-cyan-400/40 decoration-dotted underline-offset-2 hover:bg-cyan-500/20",
          pinned && "bg-cyan-500/25 ring-1 ring-cyan-400/50",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60",
          className,
        )}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseEnter={showHover}
        onMouseLeave={hideHover}
        onFocus={showHover}
        onBlur={hideHover}
        onClick={togglePin}
        aria-describedby={visible ? tooltipId : undefined}
        aria-expanded={visible}
        title={
          hasPatients
            ? patients.map((p) => p.nama).join(", ")
            : `${count} tindakan`
        }
      >
        {display}
      </button>
      {tooltip}
    </>
  );
}

export default memo(JarvisMatrixCellDetailInner);

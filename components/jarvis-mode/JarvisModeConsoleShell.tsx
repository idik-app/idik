"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useDragControls } from "framer-motion";
import { GripHorizontal, Minimize2, Maximize2 } from "lucide-react";

import { cn } from "@/lib/utils";

import JarvisModeBootSequence from "./JarvisModeBootSequence";
import JarvisScanner from "@/components/effects/JarvisScanner";

import "@/app/styles/jarvis-mode-console.css";

const POS_KEY = "idik-jarvis-console-pos-v1";
const MIN_PILL_POS_KEY = "idik-jarvis-minimized-pos-v1";
const SIZE_KEY = "idik-jarvis-console-size-v1";

type ConsoleSize = "compact" | "expanded";

type SavedPos = { x: number; y: number };

function loadPos(): SavedPos {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return { x: 0, y: 0 };
    return JSON.parse(raw) as SavedPos;
  } catch {
    return { x: 0, y: 0 };
  }
}

function loadSize(): ConsoleSize {
  if (typeof window === "undefined") return "expanded";
  return localStorage.getItem(SIZE_KEY) === "compact" ? "compact" : "expanded";
}

function loadMinPillPos(): SavedPos {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  try {
    const raw = localStorage.getItem(MIN_PILL_POS_KEY);
    if (!raw) return { x: 0, y: 0 };
    return JSON.parse(raw) as SavedPos;
  } catch {
    return { x: 0, y: 0 };
  }
}

function clampMinPillOffset(
  offset: SavedPos,
  pillW = 128,
  pillH = 44,
): SavedPos {
  if (typeof window === "undefined") return offset;
  const margin = 24;
  const minX = -(window.innerWidth - pillW - margin);
  const minY = -(window.innerHeight - pillH - margin);
  return {
    x: Math.min(0, Math.max(minX, offset.x)),
    y: Math.min(0, Math.max(minY, offset.y)),
  };
}

type Props = {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  headerActions?: ReactNode;
  /** Tombol tutup — selalu di paling kanan header. */
  headerClose?: ReactNode;
  isActive: boolean;
};

function JarvisModeConsoleShellInner({
  children,
  header,
  footer,
  headerActions,
  headerClose,
  isActive,
}: Props) {
  const dragControls = useDragControls();
  const [offset, setOffset] = useState<SavedPos>({ x: 0, y: 0 });
  const [minPillOffset, setMinPillOffset] = useState<SavedPos>({ x: 0, y: 0 });
  const [size, setSize] = useState<ConsoleSize>("expanded");
  const [booting, setBooting] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const bootedOnce = useRef(false);

  useEffect(() => {
    setOffset(loadPos());
    setMinPillOffset(clampMinPillOffset(loadMinPillPos()));
    setSize(loadSize());
  }, []);

  useEffect(() => {
    const onResize = () => {
      setMinPillOffset((prev) => {
        const next = clampMinPillOffset(prev);
        try {
          localStorage.setItem(MIN_PILL_POS_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const syncMobileOffset = () => {
      if (mq.matches) setOffset({ x: 0, y: 0 });
    };
    syncMobileOffset();
    mq.addEventListener("change", syncMobileOffset);
    return () => mq.removeEventListener("change", syncMobileOffset);
  }, []);

  useEffect(() => {
    if (!isActive) {
      setBooting(true);
      bootedOnce.current = false;
      return;
    }
    if (!bootedOnce.current) {
      setBooting(true);
    }
  }, [isActive]);

  const onBootComplete = useCallback(() => {
    bootedOnce.current = true;
    setBooting(false);
  }, []);

  const onDragEnd = useCallback((_: unknown, info: { offset: { x: number; y: number } }) => {
    const next = { x: offset.x + info.offset.x, y: offset.y + info.offset.y };
    setOffset(next);
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [offset]);

  const onMinPillDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number; y: number } }) => {
      const next = clampMinPillOffset({
        x: minPillOffset.x + info.offset.x,
        y: minPillOffset.y + info.offset.y,
      });
      setMinPillOffset(next);
      try {
        localStorage.setItem(MIN_PILL_POS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [minPillOffset],
  );

  const toggleSize = () => {
    const next = size === "expanded" ? "compact" : "expanded";
    setSize(next);
    localStorage.setItem(SIZE_KEY, next);
  };

  const shellHeightClass =
    size === "expanded"
      ? "sm:h-[min(92vh,940px)] sm:max-h-[min(92vh,940px)] sm:w-[min(96vw,1180px)]"
      : "sm:h-[min(58vh,480px)] sm:max-h-[min(58vh,480px)] sm:w-[min(92vw,520px)]";

  if (minimized) {
    return (
      <motion.div
        className="pointer-events-auto fixed bottom-6 right-6 touch-none"
        style={{ zIndex: 100_195, x: minPillOffset.x, y: minPillOffset.y }}
        drag
        dragMomentum={false}
        dragElastic={0.06}
        onDragEnd={onMinPillDragEnd}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileDrag={{ scale: 1.03, cursor: "grabbing" }}
      >
        <motion.button
          type="button"
          className={cn(
            "flex cursor-grab items-center gap-2 rounded-full border border-cyan-400/50 active:cursor-grabbing",
            "bg-[#061018]/95 px-4 py-2.5 shadow-[0_0_24px_rgba(0,224,255,0.25)] backdrop-blur-md",
            "transition hover:border-cyan-300/60 hover:shadow-[0_0_28px_rgba(0,224,255,0.35)]",
          )}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onTap={() => setMinimized(false)}
          title="Seret untuk pindah · klik untuk buka JARVIS"
          aria-label="Buka JARVIS Mode"
        >
          <span className="jarvis-core-orb h-3 w-3 shrink-0 rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">
            JARVIS
          </span>
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        "pointer-events-auto fixed left-3 right-3 top-3 bottom-3",
        "sm:left-auto sm:right-4 sm:top-auto sm:bottom-4",
        shellHeightClass,
      )}
      style={{
        zIndex: 100_195,
        x: offset.x,
        y: offset.y,
      }}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0.04}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
    >
      <div className="jarvis-console-frame relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl">
        <span className="jarvis-corner jarvis-corner-tl" aria-hidden />
        <span className="jarvis-corner jarvis-corner-tr" aria-hidden />
        <span className="jarvis-corner jarvis-corner-bl" aria-hidden />
        <span className="jarvis-corner jarvis-corner-br" aria-hidden />

        <JarvisScanner isActive={isActive && !booting} duration={4.5} />

        <JarvisModeBootSequence active={booting && isActive} onComplete={onBootComplete} />

        <header
          className="relative z-20 flex shrink-0 cursor-grab flex-col gap-1 border-b border-cyan-500/20 bg-black/30 px-2 py-1.5 active:cursor-grabbing sm:flex-row sm:items-center sm:justify-between sm:gap-1.5 sm:px-2.5"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            dragControls.start(e);
          }}
        >
          <div className="flex min-w-0 items-center gap-1.5 sm:flex-1">
            <span className="jarvis-core-orb h-2 w-2 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 overflow-hidden">{header}</div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-1">
            {headerActions}
            <button
              type="button"
              onClick={toggleSize}
              className="rounded-md border border-white/15 p-1 text-cyan-300/80 transition hover:border-cyan-400/40 hover:text-white sm:p-1.5"
              title={size === "expanded" ? "Perkecil" : "Perbesar"}
            >
              {size === "expanded" ? (
                <Minimize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              ) : (
                <Maximize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="rounded-md border border-white/15 p-1 text-cyan-300/80 transition hover:border-cyan-400/40 hover:text-white sm:p-1.5"
              title="Minimize ke pojok (bisa diseret)"
            >
              <GripHorizontal className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
            {headerClose ? (
              <div className="pointer-events-auto ml-0.5 shrink-0">{headerClose}</div>
            ) : null}
          </div>
        </header>

        <div className="relative z-10 min-h-0 flex-1 overflow-hidden px-2 py-1 sm:px-2.5 sm:py-1.5">
          <motion.div
            className="h-full min-h-0"
            initial={false}
            animate={{ opacity: booting ? 0.3 : 1 }}
          >
            {children}
          </motion.div>
        </div>

        <footer className="relative z-20 shrink-0 border-t border-cyan-500/15 bg-black/25 px-2 py-1 sm:px-2.5">
          {footer}
        </footer>
      </div>
    </motion.div>
  );
}

export default memo(JarvisModeConsoleShellInner);

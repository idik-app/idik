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

type Props = {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  isActive: boolean;
};

function JarvisModeConsoleShellInner({
  children,
  header,
  footer,
  isActive,
}: Props) {
  const dragControls = useDragControls();
  const [offset, setOffset] = useState<SavedPos>({ x: 0, y: 0 });
  const [size, setSize] = useState<ConsoleSize>("expanded");
  const [booting, setBooting] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const bootedOnce = useRef(false);

  useEffect(() => {
    setOffset(loadPos());
    setSize(loadSize());
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

  const toggleSize = () => {
    const next = size === "expanded" ? "compact" : "expanded";
    setSize(next);
    localStorage.setItem(SIZE_KEY, next);
  };

  if (minimized) {
    return (
      <motion.button
        type="button"
        className={cn(
          "pointer-events-auto fixed bottom-6 right-6 flex items-center gap-2 rounded-full border border-cyan-400/50",
          "bg-[#061018]/95 px-4 py-2.5 shadow-[0_0_24px_rgba(0,224,255,0.25)] backdrop-blur-md",
        )}
        style={{ zIndex: 100_195 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.04 }}
        onClick={() => setMinimized(false)}
      >
        <span className="jarvis-core-orb h-3 w-3 rounded-full" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">
          JARVIS
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      className="pointer-events-auto fixed inset-x-3 bottom-3 top-auto sm:inset-x-auto sm:right-4 sm:bottom-4 sm:left-auto"
      style={{
        zIndex: 100_195,
        x: offset.x,
        y: offset.y,
        width: size === "expanded" ? "min(96vw, 1180px)" : "min(92vw, 520px)",
        maxHeight: size === "expanded" ? "min(90vh, 920px)" : "min(58vh, 480px)",
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
      <div
        className={cn(
          "jarvis-console-frame relative flex max-h-[inherit] flex-col overflow-hidden rounded-2xl",
        )}
      >
        <span className="jarvis-corner jarvis-corner-tl" aria-hidden />
        <span className="jarvis-corner jarvis-corner-tr" aria-hidden />
        <span className="jarvis-corner jarvis-corner-bl" aria-hidden />
        <span className="jarvis-corner jarvis-corner-br" aria-hidden />

        <JarvisScanner isActive={isActive && !booting} duration={4.5} />

        <JarvisModeBootSequence active={booting && isActive} onComplete={onBootComplete} />

        <header
          className="relative z-20 flex shrink-0 cursor-grab items-start justify-between gap-2 border-b border-cyan-500/20 bg-black/30 px-3 py-2.5 active:cursor-grabbing sm:px-4"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            dragControls.start(e);
          }}
        >
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <span className="jarvis-core-orb mt-1 h-2.5 w-2.5 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">{header}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleSize}
              className="rounded-md border border-white/15 p-1.5 text-cyan-300/80 hover:border-cyan-400/40 hover:text-white"
              title={size === "expanded" ? "Perkecil" : "Perbesar"}
            >
              {size === "expanded" ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="rounded-md border border-white/15 p-1.5 text-cyan-300/80 hover:border-cyan-400/40 hover:text-white"
              title="Minimize ke pojok"
            >
              <GripHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <div className="relative z-10 min-h-0 flex-1 overflow-hidden px-3 py-2 sm:px-4 sm:py-3">
          <motion.div
            className="h-full overflow-y-auto overflow-x-hidden custom-scroll"
            initial={false}
            animate={{ opacity: booting ? 0.3 : 1 }}
          >
            {children}
          </motion.div>
        </div>

        <footer className="relative z-20 shrink-0 border-t border-cyan-500/15 bg-black/25 px-3 py-2 sm:px-4">
          {footer}
        </footer>
      </div>
    </motion.div>
  );
}

export default memo(JarvisModeConsoleShellInner);

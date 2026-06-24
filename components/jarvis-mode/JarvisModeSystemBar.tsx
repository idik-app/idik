"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type Props = {
  lastSyncAt?: string | null;
  compact?: boolean;
};

function JarvisModeSystemBarInner({ lastSyncAt, compact = false }: Props) {
  const [isOnline, setIsOnline] = useState(true);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setPulse((p) => !p), 1200);
    return () => clearInterval(id);
  }, []);

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 text-[8px] font-semibold uppercase tracking-wide text-white/75">
        <div className="flex items-center gap-1.5">
          <motion.span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              isOnline ? "bg-emerald-400" : "bg-rose-400",
            )}
            animate={
              isOnline
                ? { scale: pulse ? 1.2 : 1, opacity: pulse ? 1 : 0.7 }
                : undefined
            }
          />
          <span className="text-white/85 dark:text-white">
            Sync{lastSyncAt ? ` ${lastSyncAt}` : ""}
          </span>
          <span className="text-white/40">·</span>
          <span className={isOnline ? "text-emerald-300" : "text-rose-300"}>
            FHIR
          </span>
        </div>
        <span className="text-cyan-300/80">IDIK</span>
      </div>
    );
  }

  return (
    <footer
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/25",
        "bg-black/45 px-4 py-3 backdrop-blur-md",
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <motion.span
            className={cn(
              "inline-block h-2.5 w-2.5 rounded-full",
              isOnline ? "bg-emerald-400" : "bg-rose-400",
            )}
            animate={
              isOnline
                ? { scale: pulse ? 1.15 : 1, opacity: pulse ? 1 : 0.75 }
                : { scale: 1, opacity: 1 }
            }
            transition={{ duration: 0.6 }}
          />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white dark:text-white">
            Live System Sync
          </span>
          {lastSyncAt ? (
            <span className="font-mono text-[10px] tabular-nums text-white/75 dark:text-white/90">
              {lastSyncAt}
            </span>
          ) : null}
        </div>
        <span className="text-xs text-white/85 dark:text-white/90">
          {isOnline ? (
            <span className="font-semibold text-emerald-300">FHIR Active</span>
          ) : (
            <span className="font-semibold text-rose-300">Offline</span>
          )}
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80 dark:text-white/85">
        IDIK
      </p>
    </footer>
  );
}

export default memo(JarvisModeSystemBarInner);

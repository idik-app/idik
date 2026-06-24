"use client";

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Radio } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  lastSyncAt?: string | null;
};

function JarvisModeSystemBarInner({ lastSyncAt }: Props) {
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
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white dark:text-white">
            <Activity className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
            Live System Sync
          </span>
          {lastSyncAt ? (
            <span className="font-mono text-[10px] tabular-nums text-white/75 dark:text-white/90">
              {lastSyncAt}
            </span>
          ) : null}
        </div>

        <div className="hidden h-4 w-px bg-white/15 sm:block" aria-hidden />

        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
          <span className="text-xs text-white/85 dark:text-white/90">
            {isOnline ? (
              <>
                <span className="font-semibold text-emerald-300">Active</span>
                <span className="text-white/70"> (SATUSEHAT FHIR)</span>
              </>
            ) : (
              <span className="font-semibold text-rose-300">Disconnected</span>
            )}
          </span>
        </div>
      </div>

      <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80 dark:text-white/85">
        IDIK · Autonomous Kernel
      </p>
    </footer>
  );
}

export default memo(JarvisModeSystemBarInner);

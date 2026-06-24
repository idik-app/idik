"use client";

import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BOOT_LINES = [
  "INITIALIZING JARVIS KERNEL...",
  "LINKING SATUSEHAT FHIR...",
  "SYNC DATA CATHLAB...",
  "STANDBY — MONITORING ACTIVE",
] as const;

type Props = {
  active: boolean;
  onComplete: () => void;
};

function JarvisModeBootSequenceInner({ active, onComplete }: Props) {
  const [lineIndex, setLineIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) {
      setLineIndex(0);
      setDone(false);
      return;
    }
    if (lineIndex >= BOOT_LINES.length) {
      const t = window.setTimeout(() => {
        setDone(true);
        onComplete();
      }, 400);
      return () => clearTimeout(t);
    }
    const t = window.setTimeout(() => setLineIndex((i) => i + 1), 520);
    return () => clearTimeout(t);
  }, [active, lineIndex, onComplete]);

  return (
    <AnimatePresence>
      {active && !done ? (
        <motion.div
          key="jarvis-boot"
          className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-[#040a12]/95 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="jarvis-core-orb mb-6 h-14 w-14 rounded-full shadow-[0_0_30px_rgba(0,224,255,0.5)]" />
          <div className="space-y-2 px-6 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300">
            {BOOT_LINES.slice(0, lineIndex).map((line, i) => (
              <motion.p
                key={line}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={i === lineIndex - 1 ? "jarvis-boot-line text-cyan-100" : ""}
              >
                {line}
              </motion.p>
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default memo(JarvisModeBootSequenceInner);

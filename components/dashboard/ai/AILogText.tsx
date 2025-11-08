"use client";

import { motion } from "framer-motion";

type Props = {
  log: string[];
};

export default function AILogText({ log }: Props) {
  return (
    <div className="mt-4 h-32 overflow-hidden rounded-lg border border-cyan-500/20 bg-black/30 p-3 font-mono text-xs text-cyan-300/90 shadow-inner backdrop-blur-md">
      {log.length === 0 ? (
        <p className="text-cyan-500/60 text-center italic">
          ⚙️ Menunggu data analisis otonom...
        </p>
      ) : (
        <div className="space-y-1">
          {log.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="truncate"
            >
              {line}
            </motion.div>
          ))}
        </div>
      )}
      <motion.div
        className="mt-2 h-[1px] w-full bg-gradient-to-r from-cyan-500/50 to-yellow-400/40"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
    </div>
  );
}

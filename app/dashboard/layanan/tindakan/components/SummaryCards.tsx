"use client";

import { motion } from "framer-motion";

export default function SummaryCards() {
  const data = [
    { label: "Hari Ini", value: 4 },
    { label: "Minggu Ini", value: 26 },
    { label: "Total", value: 780 },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 md:gap-4 min-w-0">
      {data.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-xl border border-cyan-900/50 bg-black/30 backdrop-blur-md p-3 sm:p-4 md:p-4 text-center shadow-inner shadow-cyan-900/20 hover:shadow-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 min-w-0"
        >
          <div className="text-white/90 text-xs sm:text-sm md:text-sm font-semibold">
            {card.label}
          </div>
          <div className="text-xl sm:text-2xl md:text-2xl font-bold text-white mt-0.5 sm:mt-1 tabular-nums">
            {card.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";

export default function SummaryCards() {
  const data = [
    { label: "Hari Ini", value: 4 },
    { label: "Minggu Ini", value: 26 },
    { label: "Total", value: 780 },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 md:gap-6 min-w-0">
      {data.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-2xl border border-cyan-900/50 bg-black/30 backdrop-blur-md p-4 sm:p-5 md:p-6 text-center shadow-inner shadow-cyan-900/20 hover:shadow-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 min-w-0"
        >
          <div className="text-cyan-400 text-sm sm:text-base md:text-lg font-semibold">
            {card.label}
          </div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-cyan-300 mt-1 sm:mt-2 tabular-nums">
            {card.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

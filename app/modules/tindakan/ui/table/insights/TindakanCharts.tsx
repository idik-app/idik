"use client";
import { motion } from "framer-motion";

interface TindakanChartsProps {
  title: string;
  count?: number;
  icon?: React.ReactNode;
}

export default function TindakanCharts({ title, count = 0, icon }: TindakanChartsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 bg-gray-900/70 rounded-2xl shadow-lg border border-cyan-700/40 flex flex-col items-center justify-center space-y-2"
    >
      <div className="text-cyan-400 text-lg font-medium flex items-center gap-2">
        {icon}
        {title}
      </div>
      <div className="text-3xl font-semibold text-cyan-300 drop-shadow">
        {(count ?? 0).toLocaleString("id-ID")}
      </div>
    </motion.div>
  );
}

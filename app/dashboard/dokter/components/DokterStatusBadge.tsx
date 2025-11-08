"use client";
import { motion } from "framer-motion";

interface Props {
  status?: string;
}

export default function DoctorStatusBadge({ status }: Props) {
  const normalized = status?.toLowerCase() || "aktif";

  const color =
    normalized === "aktif"
      ? "bg-cyan-900/40 text-cyan-300 border-cyan-500/40"
      : normalized === "cuti"
      ? "bg-yellow-900/40 text-yellow-300 border-yellow-500/40"
      : normalized === "nonaktif"
      ? "bg-red-900/40 text-red-300 border-red-500/40"
      : "bg-gray-800/40 text-gray-300 border-gray-500/40";

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${color}`}
    >
      {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
    </motion.span>
  );
}

// hologramUI.tsx
"use client";
import { motion } from "framer-motion";

export function HologramUI({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 rounded-2xl bg-gradient-to-br from-cyan-800/20 to-black border border-cyan-400/30 backdrop-blur-md"
    >
      {children}
    </motion.div>
  );
}

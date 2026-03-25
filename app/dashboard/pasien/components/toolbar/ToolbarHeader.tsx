"use client";
import { motion } from "framer-motion";
import ToolbarSearchFilter from "./ToolbarSearchFilter";

/*───────────────────────────────────────────────
🧬 ToolbarHeader — Pencarian & filter (paginasi hanya di bawah tabel)
───────────────────────────────────────────────*/
export function ToolbarHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-w-0 flex-1"
    >
      <ToolbarSearchFilter />
    </motion.div>
  );
}

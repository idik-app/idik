"use client";
import { motion } from "framer-motion";
import ToolbarSearchFilter from "./ToolbarSearchFilter";
import ToolbarPagination from "./ToolbarPagination";

/*───────────────────────────────────────────────
🧬 ToolbarHeader v4.1 — Biodata Pasien Header (with pagination)
───────────────────────────────────────────────*/
export function ToolbarHeader({
  currentPage,
  totalPages,
  perPage,
  handlePageChange,
  handlePerPage,
}: {
  currentPage: number;
  totalPages: number;
  perPage: number;
  handlePageChange: (page: number) => void;
  handlePerPage: (val: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      {/* 🔹 Pencarian dan kontrol halaman */}
      <div className="flex flex-wrap items-center gap-3">
        <ToolbarSearchFilter />
        <ToolbarPagination
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          handlePageChange={handlePageChange}
          handlePerPage={handlePerPage}
        />
      </div>
    </motion.div>
  );
}

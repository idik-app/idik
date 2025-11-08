"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInventaris } from "../context/InventarisContext";
import JarvisScanner from "@/components/effects/JarvisScanner";
import ConfirmDialog from "components/ConfirmDialog";
import { useScrollMemory } from "@/app/hooks/useScrollMemory";

import {
  Edit,
  Trash2,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

/* ---------------------------------------------------
   ⚙️ InventarisTable – Cathlab JARVIS Mode v3.8
   Scroll + Sticky Header + Universal Scroll Memory
---------------------------------------------------- */

export default function InventarisTable() {
  const {
    items, // data dari context (namaBarang, lot, ukuran, stok, ed, status)
    pendingDelete,
    requestDeleteItem,
    confirmDeleteItem,
    cancelDeleteItem,
  } = useInventaris();

  const [sortField, setSortField] = useState<
    "namaBarang" | "stok" | "ed" | null
  >(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [highlighted, setHighlighted] = useState<{
    id: string;
    type: "edit" | "delete";
  } | null>(null);

  // 🧠 Scroll memory universal
  const scrollRef = useScrollMemory("inventaris");

  // ⏳ efek loading
  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(t);
  }, [items, sortField, sortOrder]);

  const handleSort = (field: "namaBarang" | "stok" | "ed") => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    if (!sortField) return 0;
    if (sortField === "namaBarang") {
      const res = a.namaBarang.localeCompare(b.namaBarang);
      return sortOrder === "asc" ? res : -res;
    }
    if (sortField === "stok") {
      return sortOrder === "asc" ? a.stok - b.stok : b.stok - a.stok;
    }
    if (sortField === "ed") {
      const dateA = new Date(a.ed).getTime();
      const dateB = new Date(b.ed).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  return (
    <>
      <div
        className="relative z-0 rounded-xl border border-yellow-500/40 
                   bg-gradient-to-br from-cyan-900/10 to-black/60 backdrop-blur-lg 
                   shadow-[0_0_15px_rgba(0,255,255,0.08)]"
        style={{ pointerEvents: "auto" }}
      >
        <JarvisScanner isActive={isLoading} />

        {/* ✅ Scroll wrapper */}
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-b-xl custom-scroll"
        >
          <table className="min-w-full text-cyan-100 text-sm relative z-10">
            {/* ✅ Sticky Header */}
            <thead className="sticky top-0 bg-black/60 backdrop-blur-md border-b border-yellow-400/30 select-none z-20">
              <tr>
                <th
                  className="py-3 px-4 text-left text-yellow-400 cursor-pointer hover:text-yellow-300"
                  onClick={() => handleSort("namaBarang")}
                >
                  <div className="flex items-center gap-1">
                    Nama Barang
                    {sortField === "namaBarang" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )
                    ) : (
                      <ArrowUpDown size={14} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-left text-yellow-400">LOT</th>
                <th className="py-3 px-4 text-left text-yellow-400">Ukuran</th>
                <th
                  className="py-3 px-4 text-left text-yellow-400 cursor-pointer hover:text-yellow-300"
                  onClick={() => handleSort("stok")}
                >
                  <div className="flex items-center gap-1">
                    Stok
                    {sortField === "stok" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )
                    ) : (
                      <ArrowUpDown size={14} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-left text-yellow-400 cursor-pointer hover:text-yellow-300"
                  onClick={() => handleSort("ed")}
                >
                  <div className="flex items-center gap-1">
                    ED
                    {sortField === "ed" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )
                    ) : (
                      <ArrowUpDown size={14} className="opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-left text-yellow-400">Status</th>
                <th className="py-3 px-4 text-left text-yellow-400">Vendor</th>
                <th className="py-3 px-4 text-right text-yellow-400">Aksi</th>
              </tr>
            </thead>

            {/* shimmer loading */}
            {isLoading ? (
              <tbody>
                {[...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="py-3 px-4">
                      <div className="w-full h-4 rounded-md bg-gradient-to-r from-cyan-900/20 via-cyan-400/30 to-cyan-900/20 animate-pulse" />
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : (
              <AnimatePresence mode="wait">
                <motion.tbody
                  key={`${sortField}-${sortOrder}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {sortedItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-6 text-cyan-400/70 italic"
                      >
                        Tidak ada data ditemukan
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((b) => {
                      const glowType =
                        highlighted?.id === b.id ? highlighted.type : null;
                      const glowColor =
                        glowType === "delete"
                          ? "0 0 18px rgba(255,0,0,0.45), 0 0 10px rgba(0,255,255,0.4)"
                          : glowType === "edit"
                          ? "0 0 18px rgba(255,215,0,0.5), 0 0 10px rgba(0,200,255,0.5)"
                          : "0 0 0 rgba(0,0,0,0)";

                      return (
                        <motion.tr
                          key={b.id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0, boxShadow: glowColor }}
                          transition={{
                            duration: glowType ? 0.4 : 0.2,
                            repeat: glowType ? Infinity : 0,
                            repeatType: "reverse",
                          }}
                          className="border-b border-cyan-500/20 hover:bg-cyan-400/10 transition"
                        >
                          <td className="py-2 px-4">{b.namaBarang}</td>
                          <td className="py-2 px-4">{b.lot}</td>
                          <td className="py-2 px-4">{b.ukuran}</td>
                          <td className="py-2 px-4 text-center">{b.stok}</td>
                          <td
                            className={`py-2 px-4 ${
                              new Date(b.ed) < new Date()
                                ? "text-red-400"
                                : "text-cyan-100"
                            }`}
                          >
                            {new Date(b.ed).toLocaleDateString("id-ID")}
                          </td>
                          <td
                            className={`py-2 px-4 ${
                              b.status === "reuse"
                                ? "text-yellow-300"
                                : "text-green-400"
                            }`}
                          >
                            {b.status.toUpperCase()}
                          </td>
                          <td className="py-2 px-4">{b.vendor || "-"}</td>

                          {/* aksi */}
                          <td
                            className="py-2 px-4 text-right space-x-2"
                            style={{
                              position: "relative",
                              zIndex: 50,
                              pointerEvents: "auto",
                            }}
                          >
                            <button
                              onClick={() => {
                                setHighlighted({ id: b.id, type: "edit" });
                                // panggil fungsi edit
                                setTimeout(() => setHighlighted(null), 400);
                              }}
                              className="text-yellow-400 hover:text-yellow-300 transition"
                              title="Edit Barang"
                            >
                              <Edit size={18} />
                            </button>

                            <button
                              onClick={() => {
                                setHighlighted({ id: b.id, type: "delete" });
                                setTimeout(() => {
                                  requestDeleteItem(b.id);
                                  setHighlighted(null);
                                }, 300);
                              }}
                              className="text-red-400 hover:text-red-300 transition"
                              title="Hapus Barang"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </motion.tbody>
              </AnimatePresence>
            )}
          </table>
        </div>
      </div>

      {/* ⚙️ Dialog Konfirmasi Hapus */}
      {pendingDelete && (
        <ConfirmDialog
          open={!!pendingDelete}
          title="Konfirmasi Hapus Barang"
          message={`Apakah Anda yakin ingin menghapus ${pendingDelete.namaBarang}?`}
          onConfirm={confirmDeleteItem}
          onCancel={cancelDeleteItem}
        />
      )}
    </>
  );
}

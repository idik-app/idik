"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePasien } from "../contexts/PasienContext";
import { usePasienCrud } from "../contexts/usePasienCrud";
import { hitungUsia } from "../utils/formatUsia";
import ConfirmDialog from "@/components/ConfirmDialog";
import JarvisScanner from "@/components/effects/JarvisScanner";
import { useScrollMemory } from "@/app/hooks/useScrollMemory";
import {
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export default function PasienTable() {
  const { patients, selectPatient } = usePasien();
  const { handleDelete } = usePasienCrud();

  const [sortField, setSortField] = useState<"nama" | "usia" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [highlighted, setHighlighted] = useState<{
    id: string;
    type: "edit" | "delete";
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<any>(null);
  const scrollRef = useScrollMemory("pasien");

  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(t);
  }, [patients, sortField, sortOrder]);

  const handleSort = (field: "nama" | "usia") => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedPatients = [...patients].sort((a, b) => {
    if (!sortField) return 0;
    if (sortField === "nama") {
      const res = a.nama.localeCompare(b.nama);
      return sortOrder === "asc" ? res : -res;
    }
    if (sortField === "usia") {
      const usiaA = hitungUsia(a.tanggalLahir).angka;
      const usiaB = hitungUsia(b.tanggalLahir).angka;
      return sortOrder === "asc" ? usiaA - usiaB : usiaB - usiaA;
    }
    return 0;
  });

  return (
    <>
      <div className="relative rounded-xl border border-yellow-500/40 bg-gradient-to-br from-cyan-900/10 to-black/60 backdrop-blur-lg shadow-[0_0_15px_rgba(0,255,255,0.08)]">
        <JarvisScanner isActive={isLoading} />
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-auto max-h-[70vh] min-h-[300px] rounded-b-xl custom-scroll"
        >
          <table className="min-w-full text-cyan-100 text-sm">
            <thead className="sticky top-0 bg-black/60 backdrop-blur-md border-b border-yellow-400/30 z-20">
              <tr>
                <th className="py-3 px-4 text-left text-yellow-400">No. RM</th>
                <th
                  onClick={() => handleSort("nama")}
                  className="py-3 px-4 text-left text-yellow-400 cursor-pointer hover:text-yellow-300"
                >
                  <div className="flex items-center gap-1">
                    Nama
                    {sortField === "nama" ? (
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
                <th className="py-3 px-4 text-left text-yellow-400">JK</th>
                <th
                  onClick={() => handleSort("usia")}
                  className="py-3 px-4 text-left text-yellow-400 cursor-pointer hover:text-yellow-300"
                >
                  <div className="flex items-center gap-1">
                    Usia
                    {sortField === "usia" ? (
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
                <th className="py-3 px-4 text-left text-yellow-400">
                  Tanggal Lahir
                </th>
                <th className="py-3 px-4 text-left text-yellow-400">Alamat</th>
                <th className="py-3 px-4 text-left text-yellow-400">No. HP</th>
                <th className="py-3 px-4 text-left text-yellow-400">
                  Pembiayaan
                </th>
                <th className="py-3 px-4 text-left text-yellow-400">Kelas</th>
                <th className="py-3 px-4 text-left text-yellow-400">
                  Asuransi
                </th>
                <th className="py-3 px-4 text-right text-yellow-400">Aksi</th>
              </tr>
            </thead>

            <AnimatePresence mode="wait">
              {isLoading ? (
                <tbody>
                  {[...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={11} className="py-3 px-4">
                        <div className="w-full h-4 rounded-md bg-gradient-to-r from-cyan-900/20 via-cyan-400/30 to-cyan-900/20 animate-pulse" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : (
                <motion.tbody
                  key={`${sortField}-${sortOrder}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {sortedPatients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="text-center py-6 text-cyan-400/70 italic"
                      >
                        Tidak ada data ditemukan
                      </td>
                    </tr>
                  ) : (
                    sortedPatients.map((p) => {
                      const usia = hitungUsia(p.tanggalLahir);
                      const glowType =
                        highlighted && highlighted.id === p.id
                          ? highlighted.type
                          : null;
                      const glowColor =
                        glowType === "delete"
                          ? "0 0 18px rgba(255,0,0,0.45), 0 0 10px rgba(0,255,255,0.4)"
                          : glowType === "edit"
                          ? "0 0 18px rgba(255,215,0,0.5), 0 0 10px rgba(0,200,255,0.5)"
                          : "0 0 0 rgba(0,0,0,0)";

                      const pembiayaanColor =
                        p.jenisPembiayaan === "BPJS"
                          ? "bg-cyan-800/50 text-cyan-300"
                          : p.jenisPembiayaan === "Umum"
                          ? "bg-yellow-800/40 text-yellow-300"
                          : "bg-green-800/40 text-green-300";

                      return (
                        <motion.tr
                          key={p.id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0, boxShadow: glowColor }}
                          transition={{
                            duration: glowType ? 0.4 : 0.2,
                            repeat: glowType ? Infinity : 0,
                            repeatType: "reverse",
                          }}
                          className="border-b border-cyan-500/20 hover:bg-cyan-400/10 transition cursor-pointer"
                          onClick={() => selectPatient(p.id, "view")}
                        >
                          <td className="py-2 px-4">{p.noRM}</td>
                          <td className="py-2 px-4">{p.nama}</td>
                          <td className="py-2 px-4">{p.jenisKelamin}</td>
                          <td className="py-2 px-4">{usia.teks}</td>
                          <td className="py-2 px-4">
                            {p.tanggalLahir
                              ? new Date(p.tanggalLahir).toLocaleDateString(
                                  "id-ID"
                                )
                              : "-"}
                          </td>
                          <td className="py-2 px-4 whitespace-normal break-words">
                            {p.alamat}
                          </td>
                          <td className="py-2 px-4">{p.noHP}</td>
                          <td className="py-2 px-4">
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full font-medium ${pembiayaanColor}`}
                            >
                              {p.jenisPembiayaan}
                            </span>
                          </td>
                          <td className="py-2 px-4">{p.kelasPerawatan}</td>
                          <td className="py-2 px-4">{p.asuransi || "-"}</td>
                          <td
                            className="py-2 px-4 text-right space-x-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => selectPatient(p.id, "view")}
                              className="text-cyan-300 hover:text-cyan-100 transition"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setHighlighted({ id: p.id, type: "edit" });
                                setTimeout(() => {
                                  selectPatient(p.id, "edit");
                                  setHighlighted(null);
                                }, 300);
                              }}
                              className="text-yellow-400 hover:text-yellow-300 transition"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setHighlighted({ id: p.id, type: "delete" });
                                setTimeout(() => {
                                  setPendingDelete(p);
                                  setHighlighted(null);
                                }, 300);
                              }}
                              className="text-red-400 hover:text-red-300 transition"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </motion.tbody>
              )}
            </AnimatePresence>
          </table>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          open={!!pendingDelete}
          title="Konfirmasi Hapus"
          message={`Apakah Anda yakin ingin menghapus pasien ${pendingDelete.nama}?`}
          onConfirm={() => {
            handleDelete(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}

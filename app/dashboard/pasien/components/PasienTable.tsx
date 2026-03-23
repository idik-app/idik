"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { usePasien } from "../contexts/PasienContext";
import { usePasienCrud } from "../hooks/usePasienCrud";
import { hitungUsia } from "../utils/formatUsia";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

/**
 * 📋 PasienTable v7.5 — Smooth & Non-Blinking Edition
 * - Animasi halus hanya saat data berubah
 * - Tidak ada efek reload terus menerus
 * - Tidak pakai JarvisScanner / shimmer
 */
export default function PasienTable() {
  const { filteredPatients, selectPatient, currentPage = 1, perPage = 10 } = usePasien();
  const { handleDelete } = usePasienCrud();
  const [sortField, setSortField] = useState<"nama" | "usia" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [pendingDelete, setPendingDelete] = useState<any>(null);
  const lastIds = useRef<string>("");

  const allFiltered = filteredPatients ?? [];
  const start = (currentPage - 1) * perPage;
  const patients = allFiltered.slice(start, start + perPage);

  // 🔹 deteksi perubahan nyata (id pasien berubah)
  const patientsKey = useMemo(
    () => JSON.stringify(allFiltered.map((p: any) => p.id)) + `-${currentPage}-${perPage}`,
    [allFiltered, currentPage, perPage]
  );

  const [animateTable, setAnimateTable] = useState(false);
  useEffect(() => {
    if (patientsKey !== lastIds.current) {
      lastIds.current = patientsKey;
      setAnimateTable(true);
      const t = setTimeout(() => setAnimateTable(false), 500);
      return () => clearTimeout(t);
    }
  }, [patientsKey]);

  const sortedPatients = useMemo(() => {
    const list = [...patients];
    if (!sortField) return list;
    return list.sort((a, b) => {
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
  }, [patients, sortField, sortOrder]);

  const handleSort = (field: "nama" | "usia") => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-yellow-500/40
                   bg-gradient-to-br from-cyan-900/10 to-black/60
                   backdrop-blur-lg shadow-[0_0_15px_rgba(0,255,255,0.08)]
                   overflow-hidden"
      >
        <motion.table
          layout
          animate={animateTable ? { opacity: [0.8, 1] } : { opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="min-w-full text-cyan-100 text-sm border-collapse"
        >
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
              <th className="py-3 px-4 text-left text-yellow-400">Asuransi</th>
              <th className="py-3 px-4 text-right text-yellow-400">Aksi</th>
            </tr>
          </thead>

          <tbody>
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
                const pembiayaanColor =
                  p.jenisPembiayaan === "BPJS"
                    ? "bg-cyan-800/50 text-cyan-300"
                    : p.jenisPembiayaan === "Umum"
                    ? "bg-yellow-800/40 text-yellow-300"
                    : "bg-green-800/40 text-green-300";

                return (
                  <tr
                    key={p.id}
                    className="border-b border-cyan-500/20 hover:bg-cyan-400/10 transition"
                  >
                    <td className="py-2 px-4">{p.noRM}</td>
                    <td className="py-2 px-4">{p.nama}</td>
                    <td className="py-2 px-4">{p.jenisKelamin}</td>
                    <td className="py-2 px-4">{usia.teks}</td>
                    <td className="py-2 px-4">
                      {p.tanggalLahir
                        ? new Date(p.tanggalLahir).toLocaleDateString("id-ID")
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

                    <td className="py-2 px-4 text-right space-x-2">
                      <button
                        onClick={() => selectPatient(p.id, "view")}
                        className="text-cyan-300 hover:text-cyan-100 transition"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => selectPatient(p.id, "edit")}
                        className="text-yellow-400 hover:text-yellow-300 transition"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => setPendingDelete(p)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </motion.table>
      </motion.div>

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

"use client";
import { useMemo, useState } from "react";
import { Pasien } from "../types/pasien";
import { usePasienState } from "./states/usePasienState";

/**
 * 🎯 usePasienFilter v6.2 — Filtering, Search, and Pagination
 * Kompatibel dengan PasienProvider v6.2
 */

export function usePasienFilter(base: ReturnType<typeof usePasienState>) {
  const { patients } = base;

  /* -------------------------------------------------------------- */
  /* 🔹 1. State filter & pagination                                 */
  /* -------------------------------------------------------------- */
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* -------------------------------------------------------------- */
  /* 🔹 2. Filter hasil berdasarkan pencarian                        */
  /* -------------------------------------------------------------- */
  /* -------------------------------------------------------------- */
  /* 🔹 2. Filter hasil berdasarkan pencarian                        */
  /* -------------------------------------------------------------- */
  const filteredPatients = useMemo(() => {
    if (!Array.isArray(patients)) return [];

    const term = searchTerm.toLowerCase().trim();
    let list = patients;

    if (term) {
      list = patients.filter((p: Pasien) => {
        return (
          p.nama?.toLowerCase().includes(term) ||
          p.no_rm?.toString().includes(term) ||
          p.alamat?.toLowerCase().includes(term) ||
          p.no_hp?.toString().includes(term) ||
          p.jenis_pembiayaan?.toLowerCase().includes(term) ||
          p.kelas?.toLowerCase().includes(term)
        );
      });
    }

    // 👉 buat key unik untuk membandingkan isi
    const key = JSON.stringify(list.map((p) => p.id));
    // cache hasil agar referensi stabil
    return useMemo(() => list, [key]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, searchTerm]);

  /* -------------------------------------------------------------- */
  /* 🔹 3. Pagination hasil filter                                   */
  /* -------------------------------------------------------------- */
  const paginatedPatients = useMemo(() => {
    if (!Array.isArray(filteredPatients)) return [];
    const start = (currentPage - 1) * rowsPerPage;
    const slice = filteredPatients.slice(start, start + rowsPerPage);
    const key = JSON.stringify(slice.map((p) => p.id));
    return useMemo(() => slice, [key]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPatients, currentPage, rowsPerPage]);

  /* -------------------------------------------------------------- */
  /* 🔹 4. Utility navigasi halaman                                  */
  /* -------------------------------------------------------------- */
  const totalPages = useMemo(() => {
    return Math.ceil((filteredPatients?.length || 0) / rowsPerPage) || 1;
  }, [filteredPatients, rowsPerPage]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  /* -------------------------------------------------------------- */
  /* 🔹 5. Return semua fungsi & data                                */
  /* -------------------------------------------------------------- */
  return {
    searchTerm,
    handleSearch,
    currentPage,
    handlePageChange,
    rowsPerPage,
    setRowsPerPage,
    filteredPatients,
    paginatedPatients,
    totalPages,
  };
}

"use client";
import { useState, useMemo, useEffect } from "react";
import { Pasien } from "../types/pasien";

/**
 * 🎯 usePasienFilter v3.8
 * Pencarian + Pagination adaptif setelah CRUD
 */
export function usePasienFilter(patients: Pasien[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // 🔍 Filter pasien
  const filteredPatients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.nama.toLowerCase().includes(q) ||
        p.noRM?.toLowerCase?.().includes(q) ||
        p.alamat?.toLowerCase?.().includes(q)
    );
  }, [patients, searchQuery]);

  // 📄 Pagination total
  const totalPages = Math.max(
    1,
    Math.ceil(filteredPatients.length / rowsPerPage)
  );

  // ⚡ Reset halaman otomatis jika data berubah
  useEffect(() => {
    // Jika halaman sekarang > total halaman, kembali ke halaman 1
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
    // Jika habis dihapus semua, pastikan halaman 1
    if (filteredPatients.length === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filteredPatients.length, totalPages]);

  // 🔢 Data per halaman
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredPatients.slice(start, start + rowsPerPage);
  }, [filteredPatients, currentPage, rowsPerPage]);

  return {
    searchQuery,
    setSearchQuery,
    filteredPatients,
    paginatedPatients,
    rowsPerPage,
    setRowsPerPage,
    currentPage,
    setCurrentPage,
    totalPages,
  };
}

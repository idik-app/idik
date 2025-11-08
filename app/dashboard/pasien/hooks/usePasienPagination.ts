"use client";
import { useState, useMemo } from "react";
import { Pasien } from "../types/pasien";

/* 🔍 Hook pagination & search pasien */
export function usePasienPagination(data: Pasien[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return data;
    return data.filter(
      (p) =>
        p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.noRM.includes(searchQuery)
    );
  }, [data, searchQuery]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, rowsPerPage, currentPage]);

  return {
    searchQuery,
    setSearchQuery,
    rowsPerPage,
    setRowsPerPage,
    currentPage,
    setCurrentPage,
    paginatedPatients,
    totalPages,
  };
}

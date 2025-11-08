"use client";
import { useState, useMemo } from "react";
import { Pasien } from "../../types/pasien";

/**
 * 🧠 usePasienState v3.9 – Unified Filter Layer
 * Menyimpan semua state dasar pasien (data, modal, filter, pagination)
 */
export function usePasienState() {
  // ===== Data dasar =====
  const [patients, setPatients] = useState<Pasien[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Pasien | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Pasien | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [pasienActionStatus, setPasienActionStatus] = useState<
    "added" | "updated" | "deleted" | "error" | null
  >(null);
  const [loading, setLoading] = useState(true);

  // ===== Filter dasar =====
  const [filters, setFilters] = useState({
    search: "",
    pembiayaan: "Semua",
    kelas: "Semua",
  });

  // ===== Pagination sederhana =====
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // ===== Filtering dinamis =====
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchSearch =
        filters.search === "" ||
        p.nama?.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.noRM?.toLowerCase().includes(filters.search.toLowerCase());
      const matchPembiayaan =
        filters.pembiayaan === "Semua" ||
        p.jenisPembiayaan === filters.pembiayaan;
      const matchKelas =
        filters.kelas === "Semua" || p.kelasPerawatan === filters.kelas;
      return matchSearch && matchPembiayaan && matchKelas;
    });
  }, [patients, filters]);

  // ===== Pagination dinamis =====
  const paginatedPatients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, page]);

  // ===== Reset Filter =====
  const resetFilters = () => {
    setFilters({ search: "", pembiayaan: "Semua", kelas: "Semua" });
    setPage(1);
  };

  return {
    // data
    patients,
    setPatients,
    selectedPatient,
    setSelectedPatient,
    pendingDelete,
    setPendingDelete,
    modalMode,
    setModalMode,
    isProcessing,
    setIsProcessing,
    pasienActionStatus,
    setPasienActionStatus,
    loading,
    setLoading,

    // filter & pagination
    filters,
    setFilters,
    resetFilters,
    page,
    setPage,
    pageSize,
    filteredPatients,
    paginatedPatients,
  };
}

"use client";
import { useState } from "react";

/** ⚡ useTindakanFilter v6.6 — Cathlab JARVIS Gold-Cyan Hybrid
 *  Hook sederhana untuk mengelola status dan logika filter tindakan.
 *  Terhubung ke TindakanToolbar dan TindakanTable.
 */
export function useTindakanFilter() {
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filter, setFilter] = useState<{
    dokter?: string;
    tanggalMulai?: string;
    tanggalAkhir?: string;
    status?: string;
  }>({});

  /** 🔹 Tampilkan/sembunyikan panel filter */
  const toggleFilter = () => {
    setIsFilterVisible((prev) => !prev);
  };

  /** 🔹 Terapkan filter baru */
  const applyFilter = (newFilter: typeof filter) => {
    setFilter(newFilter);
  };

  /** 🔹 Reset semua filter */
  const resetFilter = () => {
    setFilter({});
  };

  return {
    isFilterVisible,
    filter,
    toggleFilter,
    applyFilter,
    resetFilter,
  };
}

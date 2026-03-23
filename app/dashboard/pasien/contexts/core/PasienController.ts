"use client";
import { useCallback } from "react";

/**
 * 🎯 usePasienController
 * Modul kontrol logika pasien:
 * - Seleksi pasien (view/edit/add)
 * - Pembukaan dan penutupan modal
 * - Pembersihan state seleksi
 */
export function usePasienController(base: any) {
  /** 🔍 Pilih pasien berdasarkan ID */
  const selectPatient = useCallback(
    (id: string | null, mode: "view" | "edit" | "add" | null = "view") => {
      const found = id
        ? base.patients.find((p: any) => p.id === id) || null
        : null;
      base.setSelectedPatient(found);
      base.setModalMode(mode);
    },
    [base.patients, base.setSelectedPatient, base.setModalMode]
  );

  /** ➕ Buka modal tambah pasien baru */
  const openAddModal = useCallback(() => {
    base.setSelectedPatient(null);
    base.setModalMode("add");
  }, [base.setSelectedPatient, base.setModalMode]);

  /** 🧹 Bersihkan seleksi & tutup modal */
  const clearSelection = useCallback(() => {
    base.setSelectedPatient(null);
    base.setModalMode(null);
  }, [base.setSelectedPatient, base.setModalMode]);

  /** 🚪 Tutup modal (alias clearSelection) */
  const closeModal = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return {
    selectPatient,
    openAddModal,
    clearSelection,
    closeModal,
  };
}

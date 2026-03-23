"use client";
import { useState, useMemo, useCallback } from "react";
import { Pasien } from "@/app/dashboard/pasien/types/pasien";
import { usePasien } from "@/app/dashboard/pasien/contexts/PasienHooks";
import { addPatient, editPatient, deletePatient } from "@/app/dashboard/pasien/actions/serverActions";
import { useNotification } from "@/app/contexts/NotificationContext";

/**
 * usePasienCrud — satu sumber data dari PasienContext.
 * CRUD memanggil server actions lalu refresh context.
 */
export function usePasienCrud() {
  const { patients, refresh, ...rest } = usePasien();
  const { show } = useNotification();
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredPatients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return patients ?? [];
    return (patients ?? []).filter((p) =>
      Object.values(p).join(" ").toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  function checkDuplicate(data: Omit<Pasien, "id">): boolean {
    const exists = (patients ?? []).some(
      (p) =>
        p.noRM === data.noRM ||
        (p.nama?.trim().toLowerCase() === data.nama?.trim().toLowerCase() &&
          p.tanggalLahir === data.tanggalLahir)
    );
    if (exists) show({ type: "warning", message: "⚠️ Data pasien ganda terdeteksi." });
    return exists;
  }

  const handleAdd = useCallback(
    async (data: Omit<Pasien, "id">) => {
      if (checkDuplicate(data)) return;
      setIsProcessing(true);
      try {
        await addPatient(data);
        setStatus("added");
        show({ type: "success", message: "✅ Pasien ditambahkan." });
        await refresh();
      } catch {
        show({ type: "error", message: "🚫 Gagal menambah pasien." });
      } finally {
        setIsProcessing(false);
      }
    },
    [patients, refresh, show]
  );

  const handleEdit = useCallback(
    async (id: string, data: Omit<Pasien, "id">) => {
      setIsProcessing(true);
      try {
        await editPatient(id, data);
        setStatus("updated");
        show({ type: "info", message: "✏️ Data pasien diperbarui." });
        await refresh();
      } catch {
        show({ type: "error", message: "🚫 Gagal memperbarui pasien." });
      } finally {
        setIsProcessing(false);
      }
    },
    [refresh, show]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setIsProcessing(true);
      try {
        await deletePatient(id);
        setStatus("deleted");
        show({ type: "warning", message: "🗑️ Data pasien dihapus." });
        await refresh();
      } catch {
        show({ type: "error", message: "🚫 Gagal menghapus pasien." });
      } finally {
        setIsProcessing(false);
      }
    },
    [refresh, show]
  );

  return {
    patients: patients ?? [],
    filteredPatients,
    searchQuery,
    setSearchQuery,
    selectedPatient: rest.selectedPatient ?? null,
    setSelectedPatient: rest.setSelectedPatient,
    modalMode: rest.modalMode,
    setModalMode: rest.setModalMode,
    openAddModal: rest.openAddModal,
    selectPatient: rest.selectPatient,
    addPatient: handleAdd,
    editPatient: handleEdit,
    deletePatient: handleDelete,
    handleDelete,
    refreshPatients: refresh,
    isProcessing,
    isSyncing: rest.loading ?? false,
    status,
    checkDuplicate,
  };
}

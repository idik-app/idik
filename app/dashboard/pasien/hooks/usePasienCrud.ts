"use client";
import { useState } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { Pasien } from "../types/pasien";
import { addPatient } from "../actions/addPatient";
import { editPatient } from "../actions/editPatient";
import { deletePatient } from "../actions/deletePatient";
import { usePasien } from "../contexts/PasienContext";

/**
 * 🧠 usePasienCrud v3.9 – Stable-OneSource
 * CRUD Pasien berbasis realtime listener tanpa double-fetch.
 */
export function usePasienCrud() {
  const { show } = useNotification();
  const { patients, setPatients } = usePasien();

  const [selectedPatient, setSelectedPatient] = useState<Pasien | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Pasien | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [pasienActionStatus, setPasienActionStatus] = useState<
    "added" | "updated" | "deleted" | "error" | null
  >(null);

  /** ➕ Tambah pasien */
  async function handleAdd(data: Omit<Pasien, "id">) {
    setIsProcessing(true);
    try {
      await addPatient(data);
      setPasienActionStatus("added");
      show({ type: "success", message: "✅ Pasien berhasil ditambahkan." });
    } catch {
      setPasienActionStatus("error");
      show({ type: "error", message: "🚫 Gagal menambah pasien." });
    } finally {
      setIsProcessing(false);
      setModalMode(null);
    }
  }

  /** ✏️ Edit pasien */
  async function handleEdit(id: string, data: Omit<Pasien, "id">) {
    setIsProcessing(true);
    try {
      await editPatient(id, data);
      setPasienActionStatus("updated");
      show({ type: "info", message: "✏️ Data pasien diperbarui." });
    } catch {
      setPasienActionStatus("error");
      show({ type: "error", message: "🚫 Gagal memperbarui pasien." });
    } finally {
      setIsProcessing(false);
      setModalMode(null);
    }
  }

  /** 🗑️ Hapus pasien */
  async function handleDelete(id: string) {
    setIsProcessing(true);
    try {
      await deletePatient(id);
      // Optimistic update
      setPatients((prev: Pasien[]) => prev.filter((p: Pasien) => p.id !== id));
      setPasienActionStatus("deleted");
      show({ type: "warning", message: "🗑️ Data pasien dihapus." });
    } catch {
      setPasienActionStatus("error");
      show({ type: "error", message: "🚫 Gagal menghapus pasien." });
    } finally {
      setIsProcessing(false);
      setPendingDelete(null);
    }
  }

  /** 🎯 Kontrol modal & seleksi pasien */
  function selectPatient(id: string, mode: "view" | "edit") {
    const found = patients.find((p: Pasien) => p.id === id) ?? null;
    setSelectedPatient(found);
    setModalMode(mode);
  }

  const closeModal = () => {
    setSelectedPatient(null);
    setModalMode(null);
  };

  const openAddModal = () => setModalMode("add");

  return {
    patients,
    selectedPatient,
    pendingDelete,
    modalMode,
    isProcessing,
    pasienActionStatus,
    setSelectedPatient,
    setPendingDelete,
    setModalMode,
    setPasienActionStatus,
    handleAdd,
    handleEdit,
    handleDelete,
    selectPatient,
    closeModal,
    openAddModal,
  };
}

"use client";
import { useState } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { Pasien } from "../types/pasien";
import { addPatient } from "../actions/addPatient";
import { editPatient } from "../actions/editPatient";
import { deletePatient } from "../actions/deletePatient";
import { refreshPatients } from "../actions/refreshPatients";
import { usePasien } from "../contexts/PasienContext";

/**
 * 🧠 usePasienCrud v4.2 – Stable Realtime Safe
 * - Sinkron Supabase penuh
 * - Penanganan delay delete dan konsistensi id
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

      // Optimistic UI sementara
      const temp: Pasien = { id: crypto.randomUUID(), ...data };
      setPatients((prev) => [...prev, temp]);

      setPasienActionStatus("added");
      show({ type: "success", message: "✅ Pasien berhasil ditambahkan." });

      // Sinkron ulang dari Supabase agar id asli muncul
      const fresh = await refreshPatients();
      setPatients(fresh);
    } catch (err) {
      console.error(err);
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
      setPatients((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...data } : p))
      );
      setPasienActionStatus("updated");
      show({ type: "info", message: "✏️ Data pasien diperbarui." });
    } catch (err) {
      console.error(err);
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

      // Delay kecil supaya Supabase sempat commit sebelum refresh
      await new Promise((r) => setTimeout(r, 400));

      // Pastikan id konsisten (tanpa String())
      setPatients((prev) => prev.filter((p) => p.id !== id));

      // Refresh ulang dari Supabase untuk memastikan sinkron
      const fresh = await refreshPatients();
      setPatients(fresh);

      setPasienActionStatus("deleted");
      show({ type: "warning", message: "🗑️ Data pasien dihapus." });
    } catch (err) {
      console.error(err);
      setPasienActionStatus("error");
      show({ type: "error", message: "🚫 Gagal menghapus pasien." });
    } finally {
      setIsProcessing(false);
      setPendingDelete(null);
    }
  }

  /** 👁️ Pilih pasien */
  function selectPatient(id: string, mode: "view" | "edit") {
    const found = patients.find((p) => p.id === id) ?? null;
    setSelectedPatient(found);
    setModalMode(mode);
  }

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
  };
}

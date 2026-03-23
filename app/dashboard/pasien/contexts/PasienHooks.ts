"use client";

import { useContext } from "react";
import { PasienContext } from "./PasienProvider";
import type { Pasien } from "../types/pasien";

/*───────────────────────────────────────────────
🔹 Hooks
───────────────────────────────────────────────*/

/**
 * Gunakan ini untuk membaca seluruh state pasien + helper (termasuk closeModal)
 */
export function usePasien() {
  const c = useContext(PasienContext);
  if (!c) throw new Error("usePasien must be used within PasienProvider");

  const setModalMode = (mode: "add" | "edit" | "view" | null) =>
    c.dispatch({ type: "SET_MODAL_MODE", payload: mode });

  const setSelectedPatient = (patient: Pasien | null) =>
    c.dispatch({ type: "SET_SELECTED_PATIENT", payload: patient });

  const openAddModal = () => {
    setSelectedPatient(null);
    setModalMode("add");
  };

  const selectPatient = (
    id: string | null,
    mode: "view" | "edit" = "view"
  ) => {
    const found = id ? c.state.patients.find((p) => p.id === id) ?? null : null;
    setSelectedPatient(found);
    setModalMode(mode);
  };

  return {
    ...c.state,
    filters: c.state.filters ?? { search: "", pembiayaan: "", kelas: "" },
    closeModal: c.closeModal,
    refresh: c.refresh,
    setModalMode,
    setSelectedPatient,
    openAddModal,
    selectPatient,
  };
}

/**
 * Gunakan ini jika butuh akses langsung ke objek state lengkap
 * (berguna untuk komponen kompleks seperti ToolbarMain)
 */
export function usePasienState() {
  const c = useContext(PasienContext);
  if (!c) throw new Error("usePasienState must be used within PasienProvider");
  return c.state;
}

/**
 * Gunakan ini jika hanya perlu dispatch action ke reducer pasien
 */
export function usePasienDispatch() {
  const c = useContext(PasienContext);
  if (!c)
    throw new Error("usePasienDispatch must be used within PasienProvider");
  return c.dispatch;
}

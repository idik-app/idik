"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import {
  usePasien,
  usePasienDispatch,
  usePasienState,
} from "@/app/dashboard/pasien/contexts/PasienHooks"; // ✅ perbaikan path impor
import PasienToolbar from "./components/PasienToolbar";
import PasienModalForm from "./components/PasienModalForm";
import PatientDetailModal from "./components/PatientDetailModal";
import type { Pasien } from "./types/pasien";

/*───────────────────────────────────────────────
📋 PasienContent v4.1 — Stable Context Edition
───────────────────────────────────────────────*/
export default function PasienContent() {
  const { modalMode, selectedPatient, closeModal } = usePasien();
  const dispatch = usePasienDispatch(); // ✅ ambil dispatch dari context global
  usePasienState(); // optional, tetap tersedia untuk state lengkap bila dibutuhkan

  const isFormModal = modalMode === "add" || modalMode === "edit";
  const isViewModal = modalMode === "view";

  const openAddModal = () => {
    dispatch({ type: "SET_SELECTED_PATIENT", payload: null });
    dispatch({ type: "SET_MODAL_MODE", payload: "add" });
  };

  return (
    <div className="space-y-6">
      {/* 🔹 Header */}
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-yellow-400 flex items-center gap-2">
          <span className="text-2xl">🧬</span> Biodata Pasien
        </h2>
        <motion.button
          onClick={openAddModal}
          whileHover={{ scale: 1.1, rotate: 8 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center justify-center
                     w-9 h-9 rounded-full border border-yellow-400/40
                     bg-gradient-to-tr from-yellow-400/20 to-cyan-400/10
                     text-yellow-300 hover:text-black hover:bg-yellow-400
                     hover:shadow-[0_0_10px_rgba(255,255,0,0.4)]
                     transition-all duration-300"
          title="Tambah Pasien Baru"
        >
          <Plus className="h-4 w-4" />
          <span className="absolute inset-0 rounded-full animate-pulse border border-yellow-500/30" />
        </motion.button>
      </header>

      {/* 🔹 Toolbar + tabel (dalam satu kartu) */}
      <PasienToolbar />

      {/* 🔹 Modal pasien */}
      <AnimatePresence mode="wait">
        {isFormModal && (
          <motion.div
            key="pasien-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            <PasienModalForm
              mode={modalMode as "add" | "edit"}
              selectedPatient={selectedPatient as Pasien | null}
              onClose={closeModal}
            />
          </motion.div>
        )}

        {isViewModal && (
          <PatientDetailModal
            patient={(selectedPatient as Pasien | null) ?? null}
            onClose={closeModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PasienProvider, usePasien } from "../pasien/contexts/PasienContext";
import PasienTable from "./components/PasienTable";
import PasienToolbar from "./components/PasienToolbar";
import ModalTambahPasien from "./components/ModalTambahPasien";
import PasienModalForm from "./components/PasienModalForm";
import PatientDetailModal from "./components/PatientDetailModal";
import { useNotification } from "@/app/contexts/NotificationContext";
import DiagnosticsHUD from "@components/DiagnosticHUD";
import { Pasien } from "../pasien/types/pasien";

/*───────────────────────────────────────────────
 ⛩️ Pasien Dashboard – Cathlab JARVIS Mode v4.1 (Fixed)
───────────────────────────────────────────────*/

type NotificationType = "success" | "info" | "error" | "warning";

/* 🧾 Audit Log Helper */
async function logAudit(action: string, detail: any) {
  try {
    const res = await fetch("/api/audit/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: `pasien_${action}`,
        module: "pasien",
        actor: "nurse_admin",
        metadata: detail,
        status: "success",
      }),
    });
    if (!res.ok) throw new Error("HTTP error");
  } catch (err) {
    console.warn("⚠️ Audit logging skipped:", err);
  }
}

function PasienDashboardContent() {
  const { modalMode, selectedPatient, pasienActionStatus, closeModal } =
    usePasien();
  const { show } = useNotification();

  useEffect(() => {
    if (!pasienActionStatus) return;

    const msgMap: Record<string, { type: NotificationType; text: string }> = {
      added: { type: "success", text: "✅ Data pasien berhasil ditambahkan." },
      updated: { type: "info", text: "✏️ Data pasien diperbarui." },
      deleted: { type: "error", text: "🗑️ Data pasien telah dihapus." },
      error: {
        type: "warning",
        text: "⚠️ Terjadi kesalahan, periksa kembali input Anda.",
      },
    };

    const entry = msgMap[pasienActionStatus];
    if (entry) show({ type: entry.type, message: entry.text });

    if (pasienActionStatus !== "error") {
      logAudit(pasienActionStatus, { patient: selectedPatient || null });
    }
  }, [pasienActionStatus, selectedPatient, show]);

  return (
    <motion.main
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative min-h-screen p-6 bg-gradient-to-br from-black via-gray-900 to-cyan-950 text-cyan-100"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-yellow-400 drop-shadow-[0_0_6px_rgba(255,215,0,0.4)]">
          🩺 Biodata Pasien
        </h1>
        <ModalTambahPasien />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <PasienToolbar />
          <DiagnosticsHUD module="Pasien" />
        </div>

        <div className="mt-4">
          <PasienTable />
        </div>
      </div>

      <AnimatePresence>
        {modalMode === "add" && (
          <PasienModalForm
            key="add-modal"
            mode="add"
            pasien={null}
            onClose={closeModal}
          />
        )}
        {modalMode === "edit" && selectedPatient && (
          <PasienModalForm
            key="edit-modal"
            mode="edit"
            pasien={selectedPatient}
            onClose={closeModal}
          />
        )}
        {modalMode === "view" && selectedPatient && (
          <PatientDetailModal
            key="view-modal"
            pasien={selectedPatient}
            onClose={closeModal}
          />
        )}
      </AnimatePresence>
    </motion.main>
  );
}

export default function PasienPage() {
  return (
    <PasienProvider>
      <PasienDashboardContent />
    </PasienProvider>
  );
}

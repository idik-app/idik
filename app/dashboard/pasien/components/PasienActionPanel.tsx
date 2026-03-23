"use client";
import { useState } from "react";
import PatientDetailModal from "./PatientDetailModal";
import PasienModalForm from "./PasienModalForm";

export default function PasienActionPanel({ patient, onUpdate }: any) {
  const [modalType, setModalType] = useState<"view" | "edit" | null>(null);

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setModalType("view")}
          className="px-2 py-1 bg-cyan-700/30 hover:bg-cyan-600/50 rounded-lg border border-cyan-400/30"
        >
          👁️
        </button>
        <button
          onClick={() => setModalType("edit")}
          className="px-2 py-1 bg-gold/20 hover:bg-gold/40 rounded-lg border border-yellow-400/30"
        >
          ✏️
        </button>
      </div>

      {modalType === "view" && (
        <PatientDetailModal
          patient={patient}
          onClose={() => setModalType(null)}
        />
      )}
      {modalType === "edit" && (
        <PasienModalForm
          mode="edit"
          selectedPatient={patient}
          onClose={() => setModalType(null)}
        />
      )}
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTindakanCrud } from "@/modules/tindakan/hooks/useTindakanCrud";
import { useNotification } from "@/app/contexts/NotificationContext";

/**
 * 💠 EditableCell v7.1 — Cathlab JARVIS Gold-Cyan Hybrid
 * Inline editor untuk Spreadsheet View (TindakanTable)
 * -----------------------------------------
 * - Klik sel → masuk mode edit
 * - Tekan Enter / blur → simpan otomatis ke Supabase
 * - Menampilkan notifikasi & flash HUD saat sukses
 */
export default function EditableCell({
  id,
  field,
  value,
  validator,
  type = "text",
}: {
  id: string | number;
  field: string;
  value: any;
  validator?: (val: any) => boolean;
  type?: "text" | "number" | "date" | "select";
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { updateField } = useTindakanCrud();
  const { show } = useNotification();

  /** Fokus otomatis saat mulai edit */
  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  /** 🧠 Simpan ke Supabase */
  const handleSave = async () => {
    if (isSaving) return;
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    // Validasi opsional
    if (validator && !validator(editValue)) {
      show(`❌ Nilai tidak valid untuk ${field}`);
      return;
    }

    setIsSaving(true);
    const result = await updateField(id, field, editValue);

    if (result === "ok") {
      show(`✅ Data ${field} tersimpan`);
    } else {
      show(`⚠️ Gagal menyimpan ${field}`);
    }

    setIsSaving(false);
    setIsEditing(false);
  };

  /** ✏️ Render Mode */
  return (
    <motion.td
      whileHover={{ backgroundColor: "rgba(0,255,255,0.06)" }}
      transition={{ duration: 0.2 }}
      className={`px-4 py-2 text-sm border-b border-cyan-900/40 ${
        isSaving ? "animate-pulse text-cyan-400" : "text-gray-200"
      }`}
      onClick={() => setIsEditing(true)}
      onBlur={handleSave}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setEditValue(value);
              setIsEditing(false);
            }
          }}
          className="w-full bg-transparent outline-none border-b border-cyan-400/50 text-cyan-200 focus:border-cyan-300 transition-all"
        />
      ) : (
        <span className="cursor-text select-text">{value ?? "-"}</span>
      )}
    </motion.td>
  );
}

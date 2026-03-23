"use client";

import { motion } from "framer-motion";
import { Pencil, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { useTindakanCrud } from "@/modules/tindakan/hooks/useTindakanCrud";
import { useNotification } from "@/app/contexts/NotificationContext";
import ModalDetail from "../modals/ModalDetail";
import ModalAddEdit from "../modals/ModalAddEdit";
import ModalDeleteConfirm from "../modals/ModalDeleteConfirm";

/**
 * 💠 TindakanActions v7.1 — Cathlab JARVIS Gold-Cyan Hybrid
 * ---------------------------------------------------------
 * Tombol aksi per baris (Detail • Edit • Delete)
 * - Efek hover neon
 * - Sinkron dengan modal dan CRUD Supabase
 * - Mengirim feedback realtime ke HUD + Notification
 */

export function TindakanActions({ row }: { row: any }) {
  const { deleteRow } = useTindakanCrud();
  const { show } = useNotification();

  const [openDetail, setOpenDetail] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  /** 🗑️ Hapus data tindakan */
  const handleDelete = async () => {
    setIsProcessing(true);
    const result = await deleteRow(row.id);
    if (result === "ok") {
      show(`🗑️ Data ${row.nama_pasien ?? "pasien"} dihapus`);
    } else {
      show("⚠️ Gagal menghapus data tindakan");
    }
    setIsProcessing(false);
    setOpenDelete(false);
  };

  return (
    <>
      <motion.div
        className="flex items-center justify-end gap-2"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* 👁 Detail */}
        <button
          onClick={() => setOpenDetail(true)}
          title="Lihat Detail"
          className="p-1.5 rounded-md hover:bg-cyan-900/40 text-cyan-300 hover:text-cyan-200 transition-all"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* ✏️ Edit */}
        <button
          onClick={() => setOpenEdit(true)}
          title="Edit Data"
          className="p-1.5 rounded-md hover:bg-amber-900/40 text-amber-300 hover:text-amber-200 transition-all"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* 🗑 Delete */}
        <button
          onClick={() => setOpenDelete(true)}
          title="Hapus Data"
          disabled={isProcessing}
          className={`p-1.5 rounded-md hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-all ${
            isProcessing ? "opacity-60 cursor-wait" : ""
          }`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </motion.div>

      {/* 🔍 Modal Detail */}
      {openDetail && (
        <ModalDetail
          open={openDetail}
          onClose={() => setOpenDetail(false)}
          data={row}
        />
      )}

      {/* 📝 Modal Edit */}
      {openEdit && (
        <ModalAddEdit
          open={openEdit}
          onClose={() => setOpenEdit(false)}
          mode="edit"
          existingData={row}
        />
      )}

      {/* ❌ Modal Delete */}
      {openDelete && (
        <ModalDeleteConfirm
          open={openDelete}
          onClose={() => setOpenDelete(false)}
          onConfirm={handleDelete}
          isProcessing={isProcessing}
          message={`Hapus tindakan untuk pasien "${row.nama_pasien}" ?`}
        />
      )}
    </>
  );
}

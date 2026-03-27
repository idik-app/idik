"use client";

import { useEffect, useState } from "react";
// framer-motion dihapus untuk kurangi initial bundle
import { DoorOpen, Plus } from "lucide-react";
import { useRuangan } from "../contexts/RuanganContext";
import RuanganTable from "./RuanganTable";
import RuanganToolbar from "./RuanganToolbar";
import RuanganPagination from "./RuanganPagination";
import RuanganShimmer from "./RuanganShimmer";
import ConfirmDeleteRuangan from "./ConfirmDeleteRuangan";
import ModalTambahRuangan from "./ModalTambahRuangan";

type ErrorType = "network" | "missing_table" | "unknown" | null;

export default function RuanganContent() {
  const {
    rows,
    loading,
    fetchRows,
    deleteRuangan,
    paginatedRows,
    filteredRows,
  } = useRuangan();
  const [error, setError] = useState<ErrorType>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    nama: string;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchRows().then(({ error }) => {
      const msg =
        typeof error === "string"
          ? error
          : error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "";
      const low = msg.toLowerCase();
      if (
        low.includes("does not exist") ||
        low.includes("schema cache") ||
        low.includes("could not find the table")
      ) {
        setError("missing_table");
      } else if (low.includes("fetch")) {
        setError("network");
      } else if (error) {
        setError("unknown");
      }
    });
  }, [fetchRows]);

  if (loading) return <RuanganShimmer />;

  const baseCard =
    "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 border border-cyan-700/30 rounded-2xl shadow-lg shadow-cyan-900/40 backdrop-blur-sm p-4";

  if (error)
    return (
      <div className={`${baseCard} text-center mt-10`}>
        {error === "network" && (
          <p className="text-red-400">
            Tidak dapat terhubung ke Supabase. Periksa koneksi atau status
            server.
          </p>
        )}
        {error === "missing_table" && (
          <p className="text-yellow-400">
            Tabel <code className="text-cyan-300">ruangan</code> belum ada. Jalankan migrasi Supabase (
            <code className="text-cyan-300">20260325180000_create_ruangan.sql</code>
            ) lalu refresh.
          </p>
        )}
        {error === "unknown" && (
          <p className="text-orange-400">
            Terjadi kesalahan saat memuat data ruangan.
          </p>
        )}
      </div>
    );

  return (
    <div className={`${baseCard} animate-in fade-in slide-in-from-top-2 duration-300`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h2 className="text-2xl font-semibold text-cyan-400 flex items-center gap-2">
          <DoorOpen className="h-7 w-7" strokeWidth={2} />
          Master Ruangan
        </h2>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 rounded-lg text-cyan-200 border border-cyan-500/40 transition-all"
        >
          <Plus size={16} />
          <span>Tambah</span>
        </button>
      </div>

      <RuanganToolbar />

      <RuanganTable
        rows={paginatedRows}
        noMatch={rows.length > 0 && filteredRows.length === 0}
        onDelete={(row) => setConfirmDelete(row)}
      />

      <RuanganPagination />

      {confirmDelete && (
        <ConfirmDeleteRuangan
          itemName={confirmDelete.nama}
          onConfirm={async () => {
            const r = await deleteRuangan(confirmDelete.id);
            if (!r.ok) throw new Error(r.error ?? "Gagal menghapus data ruangan.");
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showModal && (
        <ModalTambahRuangan
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            void fetchRows();
          }}
        />
      )}
    </div>
  );
}

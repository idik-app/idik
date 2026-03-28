"use client";

import { useEffect, useState } from "react";
import { Activity, Plus } from "lucide-react";
import { useMasterTindakan } from "../contexts/MasterTindakanContext";
import MasterTindakanTable from "./MasterTindakanTable";
import MasterTindakanToolbar from "./MasterTindakanToolbar";
import MasterTindakanPagination from "./MasterTindakanPagination";
import MasterTindakanShimmer from "./MasterTindakanShimmer";
import ConfirmDeleteMasterTindakan from "./ConfirmDeleteMasterTindakan";
import ModalTambahMasterTindakan from "./ModalTambahMasterTindakan";

type ErrorType = "network" | "missing_table" | "unknown" | null;

export default function MasterTindakanContent() {
  const {
    rows,
    loading,
    fetchRows,
    deleteMasterTindakan,
    paginatedRows,
    filteredRows,
  } = useMasterTindakan();
  const [error, setError] = useState<ErrorType>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    nama: string;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchRows().then(({ error: err }) => {
      const msg =
        typeof err === "string"
          ? err
          : err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "";
      const low = msg.toLowerCase();
      if (
        low.includes("does not exist") ||
        low.includes("schema cache") ||
        low.includes("could not find the table")
      ) {
        setError("missing_table");
      } else if (low.includes("fetch") || err instanceof TypeError) {
        setError("network");
      } else if (err) {
        setError("unknown");
      }
    });
  }, [fetchRows]);

  if (loading) return <MasterTindakanShimmer />;

  const baseCard =
    "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 border border-cyan-700/30 rounded-2xl shadow-lg shadow-cyan-900/40 backdrop-blur-sm p-4";

  if (error)
    return (
      <div className={`${baseCard} text-center mt-10`}>
        {error === "network" && (
          <p className="text-red-400">
            Tidak dapat memuat master tindakan. Periksa koneksi atau status
            server.
          </p>
        )}
        {error === "missing_table" && (
          <p className="text-yellow-400">
            Tabel <code className="text-cyan-300">master_tindakan</code> belum
            ada. Jalankan migrasi Supabase (
            <code className="text-cyan-300">
              20260328200000_master_tindakan.sql
            </code>
            ) lalu refresh.
          </p>
        )}
        {error === "unknown" && (
          <p className="text-orange-400">
            Terjadi kesalahan saat memuat master tindakan.
          </p>
        )}
      </div>
    );

  return (
    <div
      className={`${baseCard} animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h2 className="text-2xl font-semibold text-cyan-400 flex items-center gap-2">
          <Activity className="h-7 w-7" strokeWidth={2} />
          Master jenis tindakan
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

      <MasterTindakanToolbar />

      <MasterTindakanTable
        rows={paginatedRows}
        noMatch={rows.length > 0 && filteredRows.length === 0}
        onDelete={(row) => setConfirmDelete(row)}
      />

      <MasterTindakanPagination />

      {confirmDelete ? (
        <ConfirmDeleteMasterTindakan
          itemName={confirmDelete.nama}
          onConfirm={async () => {
            const r = await deleteMasterTindakan(confirmDelete.id);
            if (!r.ok) throw new Error(r.error ?? "Gagal menghapus.");
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}

      {showModal ? (
        <ModalTambahMasterTindakan
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            void fetchRows();
          }}
        />
      ) : null}
    </div>
  );
}

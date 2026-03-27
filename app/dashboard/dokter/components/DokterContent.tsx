"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { UserPlus } from "lucide-react";
import { useDokter } from "../contexts/DokterContext";
import DokterTable from "./DokterTable";
import DokterToolbar from "./DokterToolbar";
import DokterPagination from "./DokterPagination";
import ShimmerDokter from "./ShimmerDokter";
import ConfirmDialog from "./ConfirmDialog";
import DokterStatusBadge from "./DokterStatusBadge";
import ExportReportDokter from "./ExportReportDokter";

const ModalTambahDokter = dynamic(() => import("./ModalTambahDokter"), {
  ssr: false,
});

const ModalEditDokter = dynamic(() => import("./ModalEditDokter"), {
  ssr: false,
});

type ErrorType = "network" | "missing_table" | "unknown" | null;

export default function DokterContent() {
  const {
    doctors,
    loading,
    fetchDoctors,
    deleteDoctor,
    paginatedDoctors,
    filteredDoctors,
  } = useDokter();
  const [error, setError] = useState<ErrorType>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    nama: string;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<{
    id: string;
    nama: string;
    spesialis?: string;
    kontak?: string;
    status?: string;
  } | null>(null);

  useEffect(() => {
    fetchDoctors().then(({ error }) => {
      const msg =
        typeof error === "string"
          ? error
          : error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "";
      if (msg.includes("table")) setError("missing_table");
      else if (msg.includes("fetch")) setError("network");
      else if (error) setError("unknown");
    });
  }, [fetchDoctors]);

  if (loading) return <ShimmerDokter />;

  const baseCard =
    "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 border border-cyan-700/30 rounded-2xl shadow-lg shadow-cyan-900/40 backdrop-blur-sm p-4";

  if (error)
    return (
      <div className={`${baseCard} text-center mt-10`}>
        {error === "network" && (
          <p className="text-red-400">
            🔴 Tidak dapat terhubung ke Supabase. Server mungkin paused.
          </p>
        )}
        {error === "missing_table" && (
          <p className="text-yellow-400">
            ⚠️ Tabel 'dokter' belum dibuat di Supabase.
          </p>
        )}
        {error === "unknown" && (
          <p className="text-orange-400">
            ⚠️ Terjadi kesalahan tak terduga saat memuat data dokter.
          </p>
        )}
      </div>
    );

  return (
    <div className={`${baseCard} animate-in fade-in slide-in-from-top-2 duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-semibold text-cyan-400 flex items-center gap-2">
          👨‍⚕️ Daftar Dokter
        </h2>
        <div className="flex items-center gap-2">
          <ExportReportDokter data={filteredDoctors} />
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 rounded-lg text-cyan-200 border border-cyan-500/40 transition-all"
          >
            <UserPlus size={16} />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      <DokterToolbar />

      {/* Tabel */}
      <DokterTable
        noMatch={doctors.length > 0 && filteredDoctors.length === 0}
        doctors={paginatedDoctors.map((d) => ({
          ...d,
          badge: <DokterStatusBadge status={(d as any).status} />,
        }))}
        onEdit={(row) =>
          setEditingDoctor({
            id: row.id,
            nama: row.nama,
            spesialis: row.spesialis,
            kontak: row.kontak,
            status: row.status,
          })
        }
        onDelete={(row) => setConfirmDelete(row)}
      />

      <DokterPagination />

      {/* Dialog Konfirmasi */}
      {confirmDelete && (
        <ConfirmDialog
          itemName={confirmDelete.nama}
          onConfirm={async () => {
            const r = await deleteDoctor(confirmDelete.id);
            if (!r.ok) throw new Error(r.error ?? "Gagal menghapus data dokter.");
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Modal Tambah Dokter */}
      {showModal && (
        <ModalTambahDokter
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchDoctors();
          }}
        />
      )}

      {editingDoctor && (
        <ModalEditDokter
          doctor={editingDoctor}
          onClose={() => setEditingDoctor(null)}
          onSuccess={() => {
            setEditingDoctor(null);
            fetchDoctors();
          }}
        />
      )}
    </div>
  );
}

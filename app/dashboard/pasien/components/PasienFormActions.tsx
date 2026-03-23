"use client";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import React from "react";

interface Props {
  onCancel: () => void;
  onSubmit: () => void;
  confirmOpen: boolean;
  setConfirmOpen: (v: boolean) => void;
  loading: boolean;
  notif: string;
}

export default function PasienFormActions({
  onCancel,
  onSubmit,
  confirmOpen,
  setConfirmOpen,
  loading,
  notif,
}: Props) {
  return (
    <>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-yellow-600 text-yellow-400 hover:bg-yellow-600/20 transition"
        >
          Batal
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition"
        >
          Simpan
        </button>
      </div>
      {notif && <p className="text-center text-sm pt-2">{notif}</p>}

      <ConfirmDialog
        open={confirmOpen}
        message={
          <>
            Pastikan data pasien sesuai dengan Supabase. <br />
            Lanjutkan simpan?
          </>
        }
        loading={loading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onSubmit}
      />
    </>
  );
}

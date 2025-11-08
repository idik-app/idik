"use client";

import { useState } from "react";
import { useDoctor } from "../contexts/DokterContext";

export default function DoctorForm({ initialData, onClose }) {
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState(
    initialData || {
      nama_dokter: "",
      spesialis: "",
      nomor_str: "",
      nomor_sip: "",
      kontak: "",
      status_aktif: true,
    }
  );
  const { addDoctor, updateDoctor } = useDoctor();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEdit) await updateDoctor(initialData.id, form);
    else await addDoctor(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900/80 p-6 rounded-2xl border border-cyan-500 w-full max-w-md space-y-3"
      >
        <h2 className="text-cyan-300 text-lg font-semibold text-center">
          {isEdit ? "Edit Dokter" : "Tambah Dokter"}
        </h2>
        {Object.keys(form).map(
          (key) =>
            key !== "status_aktif" && (
              <input
                key={key}
                type="text"
                placeholder={key.replace("_", " ")}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-transparent border border-cyan-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
              />
            )
        )}
        <label className="flex items-center gap-2 text-sm text-cyan-300">
          <input
            type="checkbox"
            checked={form.status_aktif}
            onChange={(e) =>
              setForm({ ...form, status_aktif: e.target.checked })
            }
          />
          Aktif
        </label>
        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-600 rounded-xl text-gray-300"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-cyan-400 text-black font-semibold"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}

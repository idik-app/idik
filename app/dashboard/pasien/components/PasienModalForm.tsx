"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalWrapper from "@/components/global/ModalWrapper";
import type { Pasien } from "../types/pasien";
import { addPatientAction, editPatientAction } from "../actions/clientBridge";

/*───────────────────────────────────────────────
 🧠 PasienModalForm – Add/Edit Modal (Stable v5.6.6)
   🔹 Aman React 19 + Framer Motion
   🔹 Bridge Supabase
   🔹 Desain Gold-Cyan Hybrid
───────────────────────────────────────────────*/
export default function PasienModalForm({
  mode,
  selectedPatient,
  onClose,
}: {
  mode: "add" | "edit" | null;
  selectedPatient?: Pasien | null;
  onClose: () => void;
}) {
  if (!mode) return null;
  const isEdit = mode === "edit";

  const [formData, setFormData] = useState<Omit<Pasien, "id">>({
    noRM: "",
    nama: "",
    jenisKelamin: "L",
    tanggalLahir: "",
    alamat: "",
    noHP: "",
    jenisPembiayaan: "Umum",
    kelasPerawatan: "Kelas 2",
    asuransi: "",
  });

  useEffect(() => {
    if (isEdit && selectedPatient) {
      setFormData({
        noRM: selectedPatient.noRM,
        nama: selectedPatient.nama,
        jenisKelamin: selectedPatient.jenisKelamin,
        tanggalLahir: selectedPatient.tanggalLahir,
        alamat: selectedPatient.alamat || "",
        noHP: selectedPatient.noHP || "",
        jenisPembiayaan: selectedPatient.jenisPembiayaan,
        kelasPerawatan: selectedPatient.kelasPerawatan,
        asuransi: selectedPatient.asuransi || "",
      });
    }
  }, [isEdit, selectedPatient]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: name === "jenisKelamin" ? (value as "L" | "P") : value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.noRM.trim() || !formData.nama.trim()) {
      setError("No. RM dan Nama wajib diisi");
      return;
    }
    setLoading(true);
    try {
      if (isEdit && selectedPatient)
        await editPatientAction(selectedPatient.id, formData);
      else await addPatientAction(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <ModalWrapper onClose={onClose} className="w-full max-w-lg">
        {/* Safe wrapper agar Framer tidak meng-clone portal root */}
        <div className="relative z-[310]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gradient-to-br from-cyan-900/40 to-black/60 border border-cyan-500/40 
                       shadow-[0_0_25px_rgba(0,255,255,0.3)] rounded-2xl p-6 text-cyan-100"
          >
            <h3 className="text-2xl font-semibold text-center mb-4 text-cyan-300">
              {isEdit ? "✏️ Edit Pasien" : "➕ Tambah Pasien"}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="No. RM"
                name="noRM"
                value={formData.noRM}
                onChange={handleChange}
              />
              <InputField
                label="Nama"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
              />

              <div>
                <label className="text-sm text-cyan-300">Jenis Kelamin</label>
                <select
                  name="jenisKelamin"
                  value={formData.jenisKelamin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 mt-1 bg-black/30 border border-cyan-600/50 
                             rounded-lg focus:outline-none focus:border-yellow-400"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <InputField
                label="Tanggal Lahir"
                name="tanggalLahir"
                type="date"
                value={formData.tanggalLahir}
                onChange={handleChange}
              />
              <InputField
                label="Alamat"
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                colSpan
              />
              <InputField
                label="No. HP"
                name="noHP"
                value={formData.noHP}
                onChange={handleChange}
                colSpan
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
            )}

            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 rounded-lg bg-cyan-600/60 hover:bg-cyan-500/80 
                           border border-cyan-400/50 shadow-[0_0_15px_rgba(0,255,255,0.5)] 
                           hover:shadow-[0_0_20px_rgba(0,255,255,0.8)] transition-all disabled:opacity-60"
              >
                {loading ? "⏳ Menyimpan..." : "💾 Simpan"}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg bg-transparent border border-yellow-400/50 
                           text-yellow-400 hover:bg-yellow-400/20 
                           hover:shadow-[0_0_10px_rgba(255,215,0,0.4)] transition-all"
              >
                ✖ Batal
              </button>
            </div>
          </motion.div>
        </div>
      </ModalWrapper>
    </AnimatePresence>
  );
}

/*─────────────🔹 Komponen Input────────────────*/
function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  colSpan = false,
}: {
  label: string;
  name: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  colSpan?: boolean;
}) {
  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <label className="text-sm text-cyan-300">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 mt-1 bg-black/30 border border-cyan-600/50 
                   rounded-lg focus:outline-none focus:border-yellow-400"
      />
    </div>
  );
}

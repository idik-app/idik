"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalWrapper from "@/components/global/ModalWrapper";
import type { Pasien } from "../types/pasien";
import {
  addPatientAction,
  editPatientAction,
  refreshPatientsAction,
} from "../actions/clientBridge";
import { usePasienDispatch } from "../contexts/PasienHooks";
import { mapFromSupabase } from "../data/pasienSchema";

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
  const dispatch = usePasienDispatch();

  const [formData, setFormData] = useState<Omit<Pasien, "id">>({
    noRM: "",
    nama: "",
    jenisKelamin: "L",
    tanggalLahir: "",
    alamat: "",
    noHP: "",
    jenisPembiayaan: "BPJS",
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

function normalizeTanggalLahir(raw: string): string {
  if (!raw) return "";
  // Jika sudah format YYYY-MM-DD, langsung pakai
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // DUKUNG format seperti 30-6-1967 atau 30/06/1967
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const [_, d, mo, y] = m;
    const day = d.padStart(2, "0");
    const month = mo.padStart(2, "0");
    return `${y}-${month}-${day}`;
  }

  return raw;
}

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((p) => ({
      ...p,
      [name]:
        name === "jenisKelamin"
          ? (value as "L" | "P")
          : name === "tanggalLahir"
          ? normalizeTanggalLahir(value)
          : value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.noRM.trim() || !formData.nama.trim()) {
      setError("No. RM dan Nama wajib diisi");
      return;
    }
    setLoading(true);
    try {
      const resp = isEdit && selectedPatient
        ? await editPatientAction(selectedPatient.id, formData)
        : await addPatientAction(formData);

      if (!resp?.ok) {
        const msg =
          resp?.error?.message ||
          resp?.message ||
          (typeof resp?.error === "string" ? resp.error : null) ||
          "Terjadi kesalahan saat menyimpan data";
        throw new Error(msg);
      }

      // Setelah berhasil simpan, refresh list agar tabel langsung terisi
      const refreshed = await refreshPatientsAction();
      if (refreshed?.ok && Array.isArray(refreshed?.data)) {
        const mapped = refreshed.data.map((p: any) => mapFromSupabase(p));
        dispatch({ type: "SET_PATIENTS", payload: mapped });
      }
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
                type="text"
                placeholder="30-06-1967 atau 1967-06-30"
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

              <div>
                <label className="text-sm text-cyan-300">Jenis Pembiayaan</label>
                <select
                  name="jenisPembiayaan"
                  value={formData.jenisPembiayaan}
                  onChange={handleChange}
                  className="w-full px-3 py-2 mt-1 bg-black/30 border border-cyan-600/50 
                             rounded-lg focus:outline-none focus:border-yellow-400"
                >
                  <option value="BPJS">BPJS</option>
                  <option value="BPJS PBI">BPJS PBI</option>
                  <option value="Umum">Umum</option>
                  <option value="Asuransi">Asuransi</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-cyan-300">Kelas Perawatan</label>
                <select
                  name="kelasPerawatan"
                  value={formData.kelasPerawatan}
                  onChange={handleChange}
                  className="w-full px-3 py-2 mt-1 bg-black/30 border border-cyan-600/50 
                             rounded-lg focus:outline-none focus:border-yellow-400"
                >
                  <option value="Kelas 1">Kelas 1</option>
                  <option value="Kelas 2">Kelas 2</option>
                  <option value="Kelas 3">Kelas 3</option>
                </select>
              </div>

              <InputField
                label="Asuransi (opsional)"
                name="asuransi"
                value={formData.asuransi}
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
  placeholder,
}: {
  label: string;
  name: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  colSpan?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <label className="text-sm text-cyan-300">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 mt-1 bg-black/30 border border-cyan-600/50 
                   rounded-lg focus:outline-none focus:border-yellow-400"
      />
    </div>
  );
}

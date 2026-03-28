"use client";

import { useEffect, useMemo, useState } from "react";
import ModalWrapper from "@/components/global/ModalWrapper";
import type { Pasien } from "../types/pasien";
import { addPatientAction, editPatientAction } from "../actions/clientBridge";
import { usePasien, usePasienDispatch } from "../contexts/PasienHooks";
import { formatTanggalLahirFromDb } from "../data/pasienSchema";
import { pasienSchema } from "../data/pasienValidation";
import { hitungUsia } from "../utils/formatUsia";
import {
  normalizeNamaPasien,
  normalizeNamaPasienInput,
} from "../utils/normalizeNamaPasien";
import { formatPasienApiValidationError } from "../utils/pasienValidationMessages";

/*───────────────────────────────────────────────
 🧠 PasienModalForm – Add/Edit Modal (Stable v5.6.6)
   🔹 Aman React 19
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
  const isEdit = mode === "edit";
  const dispatch = usePasienDispatch();
  const { refresh } = usePasien();

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

  const editPatientId = isEdit ? selectedPatient?.id ?? null : null;

  /**
   * Hanya seed form saat membuka modal / ganti pasien (mode atau id).
   * Jangan masukkan `selectedPatient` ke dependency: UPSERT & refresh mengganti
   * referensi objek dan akan memicu effect → setFormData menimpa input user.
   */
  useEffect(() => {
    if (mode === "add") {
      setFormData({
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
      return;
    }
    if (mode !== "edit" || !editPatientId || !selectedPatient) return;
    setFormData({
      noRM: selectedPatient.noRM,
      nama: normalizeNamaPasien(selectedPatient.nama ?? ""),
      jenisKelamin: selectedPatient.jenisKelamin,
      tanggalLahir: formatTanggalLahirFromDb(selectedPatient.tanggalLahir),
      alamat: selectedPatient.alamat || "",
      noHP: selectedPatient.noHP || "",
      jenisPembiayaan: selectedPatient.jenisPembiayaan,
      kelasPerawatan: selectedPatient.kelasPerawatan,
      asuransi: selectedPatient.asuransi || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lihat komentar di atas
  }, [mode, editPatientId]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const umurTeks = useMemo(() => {
    const t = formatTanggalLahirFromDb(formData.tanggalLahir?.trim() ?? "");
    if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return "—";
    const iso = t;
    return hitungUsia(iso).teks;
  }, [formData.tanggalLahir]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setError("");
    const { name, value } = e.target;
    setFormData((p) => {
      const nextVal =
        name === "jenisKelamin"
          ? (value as "L" | "P")
          : name === "tanggalLahir"
          ? value
          : name === "nama"
          ? normalizeNamaPasienInput(value)
          : value;
      const patch: Partial<Omit<Pasien, "id">> = {
        [name]: nextVal,
      } as Partial<Omit<Pasien, "id">>;
      return { ...p, ...patch };
    });
  };

  const handleSubmit = async () => {
    const namaFinal = normalizeNamaPasien(formData.nama);
    if (!formData.noRM.trim() || !namaFinal) {
      setError("No. RM dan Nama wajib diisi");
      return;
    }
    const tanggalLahirIso = formatTanggalLahirFromDb(formData.tanggalLahir.trim());
    const payload = {
      ...formData,
      nama: namaFinal,
      tanggalLahir: tanggalLahirIso,
      noHP: (formData.noHP ?? "").trim(),
    };

    const parsedLocal = pasienSchema.safeParse(payload);
    if (!parsedLocal.success) {
      setError(formatPasienApiValidationError({ error: parsedLocal.error.flatten() }));
      return;
    }

    setLoading(true);
    try {
      const resp = isEdit && selectedPatient
        ? await editPatientAction(selectedPatient.id, payload)
        : await addPatientAction(payload);

      if (!resp?.ok) {
        throw new Error(formatPasienApiValidationError(resp));
      }

      if (resp.data) {
        dispatch({ type: "UPSERT_PATIENT", payload: resp.data as Pasien });
      }
      onClose();
      void refresh();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  const handleTanggalLahirBlur = () => {
    setFormData((p) => ({
      ...p,
      tanggalLahir: formatTanggalLahirFromDb(p.tanggalLahir.trim()),
    }));
  };

  if (!mode) return null;

  return (
    <ModalWrapper onClose={onClose}>
      <div className="relative z-[310]">
        <div
          className="animate-in fade-in zoom-in-95 duration-200 rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-900/40 to-black/60 p-3 text-cyan-100 shadow-[0_0_16px_rgba(0,255,255,0.22)] sm:rounded-2xl sm:p-6 sm:shadow-[0_0_25px_rgba(0,255,255,0.3)]"
        >
            <h3 className="mb-2 text-center text-lg font-semibold text-cyan-300 sm:mb-4 sm:text-2xl">
              {isEdit ? "✏️ Edit Pasien" : "➕ Tambah Pasien"}
            </h3>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
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

              <div className="col-span-1 grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-3 sm:gap-3">
                <div>
                  <label className="text-xs text-cyan-300 sm:text-sm">Jenis Kelamin</label>
                  <select
                    name="jenisKelamin"
                    value={formData.jenisKelamin}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-cyan-600/50 bg-black/30 px-2.5 py-1.5 text-sm focus:border-yellow-400 focus:outline-none sm:px-3 sm:py-2 sm:text-base"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <InputField
                  label="Tanggal Lahir"
                  name="tanggalLahir"
                  type="text"
                  placeholder="1967-06-30 atau 30-06-1967"
                  value={formData.tanggalLahir}
                  onChange={handleChange}
                  onBlur={handleTanggalLahirBlur}
                />

                <div>
                  <label className="text-xs text-cyan-300 sm:text-sm">Umur</label>
                  <input
                    readOnly
                    tabIndex={-1}
                    value={umurTeks}
                    className="mt-1 w-full cursor-default rounded-lg border border-cyan-600/30 bg-black/20 px-2.5 py-1.5 text-sm text-cyan-200 sm:px-3 sm:py-2 sm:text-base"
                    aria-live="polite"
                  />
                </div>
              </div>
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
                <label className="text-xs text-cyan-300 sm:text-sm">Jenis Pembiayaan</label>
                <select
                  name="jenisPembiayaan"
                  value={formData.jenisPembiayaan}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-cyan-600/50 bg-black/30 px-2.5 py-1.5 text-sm focus:border-yellow-400 focus:outline-none sm:px-3 sm:py-2 sm:text-base"
                >
                  <option value="BPJS">BPJS</option>
                  <option value="NPBI">NPBI</option>
                  <option value="Umum">Umum</option>
                  <option value="Asuransi">Asuransi</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-cyan-300 sm:text-sm">Kelas Perawatan</label>
                <select
                  name="kelasPerawatan"
                  value={formData.kelasPerawatan}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-cyan-600/50 bg-black/30 px-2.5 py-1.5 text-sm focus:border-yellow-400 focus:outline-none sm:px-3 sm:py-2 sm:text-base"
                >
                  <option value="Kelas 1">1</option>
                  <option value="Kelas 2">2</option>
                  <option value="Kelas 3">3</option>
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
              <p
                className="mx-auto mt-3 max-w-full text-left text-sm whitespace-pre-line rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-red-300 sm:max-w-md"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="mt-4 flex w-full flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:justify-center sm:gap-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full shrink-0 rounded-lg border border-cyan-400/50 bg-cyan-600/60 px-4 py-2.5 shadow-[0_0_15px_rgba(0,255,255,0.5)] transition-all hover:bg-cyan-500/80 hover:shadow-[0_0_20px_rgba(0,255,255,0.8)] disabled:opacity-60 sm:w-auto sm:px-6 sm:py-2"
              >
                {loading ? "⏳ Menyimpan..." : "💾 Simpan"}
              </button>
              <button
                onClick={onClose}
                className="w-full shrink-0 rounded-lg border border-yellow-400/50 bg-transparent px-4 py-2.5 text-yellow-400 transition-all hover:bg-yellow-400/20 hover:shadow-[0_0_10px_rgba(255,215,0,0.4)] sm:w-auto sm:px-6 sm:py-2"
              >
                ✖ Batal
              </button>
            </div>
        </div>
      </div>
    </ModalWrapper>
  );
}

/*─────────────🔹 Komponen Input────────────────*/
function InputField({
  label,
  name,
  value,
  onChange,
  onBlur,
  type = "text",
  colSpan = false,
  placeholder,
}: {
  label: string;
  name: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  type?: string;
  colSpan?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={colSpan ? "col-span-1 sm:col-span-2" : ""}>
      <label className="text-xs text-cyan-300 sm:text-sm">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-cyan-600/50 bg-black/30 px-2.5 py-1.5 text-sm focus:border-yellow-400 focus:outline-none sm:px-3 sm:py-2 sm:text-base"
      />
    </div>
  );
}

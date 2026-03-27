"use client";

import { useMemo, useState } from "react";
import ModalWrapper from "@/components/global/ModalWrapper";
import type { Pasien } from "@/app/dashboard/pasien/types/pasien";
import { pasienSchema } from "@/app/dashboard/pasien/data/pasienValidation";
import { formatTanggalLahirFromDb } from "@/app/dashboard/pasien/data/pasienSchema";
import { hitungUsia } from "@/app/dashboard/pasien/utils/formatUsia";
import {
  normalizeNamaPasien,
  normalizeNamaPasienInput,
} from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import { formatPasienApiValidationError } from "@/app/dashboard/pasien/utils/pasienValidationMessages";

export default function TambahPasienQuickModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (patient: Pasien) => Promise<void> | void;
}) {
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const umurTeks = useMemo(() => {
    const t = formatTanggalLahirFromDb(formData.tanggalLahir?.trim() ?? "");
    if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return "—";
    return hitungUsia(t).teks;
  }, [formData.tanggalLahir]);

  if (!open) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
      return { ...p, [name]: nextVal } as Omit<Pasien, "id">;
    });
  };

  const handleTanggalLahirBlur = () => {
    setFormData((p) => ({
      ...p,
      tanggalLahir: formatTanggalLahirFromDb(p.tanggalLahir.trim()),
    }));
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
      setError(
        formatPasienApiValidationError({ error: parsedLocal.error.flatten() }),
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pasien/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !json?.ok) {
        throw new Error(formatPasienApiValidationError(json));
      }

      const patient = json.data as Pasien;
      onClose();
      await onSaved(patient);
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose} className="w-full max-w-lg">
      <div className="relative z-[310]">
        <div
          className="bg-gradient-to-br from-cyan-900/40 to-black/60 border border-cyan-500/40
                     shadow-[0_0_25px_rgba(0,255,255,0.3)] rounded-2xl p-6 text-cyan-100
                     animate-in fade-in zoom-in-95 duration-200"
        >
          <h3 className="text-2xl font-semibold text-center mb-4 text-cyan-300">
            ➕ Tambah Pasien
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

            <div className="col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-sm text-cyan-300">Jenis Kelamin</label>
                <select
                  name="jenisKelamin"
                  value={formData.jenisKelamin}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-cyan-600/50 bg-black/30 px-3 py-2 focus:outline-none focus:border-yellow-400"
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
                <label className="text-sm text-cyan-300">Umur</label>
                <input
                  readOnly
                  tabIndex={-1}
                  value={umurTeks}
                  className="mt-1 w-full cursor-default rounded-lg border border-cyan-600/30 bg-black/20 px-3 py-2 text-cyan-200"
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
              <label className="text-sm text-cyan-300">Jenis Pembiayaan</label>
              <select
                name="jenisPembiayaan"
                value={formData.jenisPembiayaan}
                onChange={handleChange}
                className="w-full px-3 py-2 mt-1 bg-black/30 border border-cyan-600/50 rounded-lg focus:outline-none focus:border-yellow-400"
              >
                <option value="BPJS">BPJS</option>
                <option value="NPBI">NPBI</option>
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
                className="w-full px-3 py-2 mt-1 bg-black/30 border border-cyan-600/50 rounded-lg focus:outline-none focus:border-yellow-400"
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
              className="text-red-300 text-sm mt-3 max-w-md mx-auto text-left whitespace-pre-line rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-cyan-600/60 hover:bg-cyan-500/80 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,255,255,0.5)] hover:shadow-[0_0_20px_rgba(0,255,255,0.8)] transition-all disabled:opacity-60"
            >
              {loading ? "⏳ Menyimpan..." : "💾 Simpan"}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-transparent border border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/20 hover:shadow-[0_0_10px_rgba(255,215,0,0.4)] transition-all"
            >
              ✖ Batal
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}

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
    <div className={colSpan ? "col-span-2" : ""}>
      <label className="text-sm text-cyan-300">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full px-3 py-2 mt-1 bg-black/30 border border-cyan-600/50 rounded-lg focus:outline-none focus:border-yellow-400"
      />
    </div>
  );
}


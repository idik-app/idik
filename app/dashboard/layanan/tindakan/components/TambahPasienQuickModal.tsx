"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const RM_LOOKUP_DEBOUNCE_MS = 420;
const RM_LOOKUP_MIN_LEN = 2;

const initialForm = (): Omit<Pasien, "id"> => ({
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

function normalizeRmDigits(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

/** Cocokkan RM meski format beda (mis. spasi vs hanya angka). */
function rmEquivalent(dbNoRm: string, typedRm: string): boolean {
  const a = String(dbNoRm ?? "").trim();
  const b = String(typedRm ?? "").trim();
  if (a === b) return true;
  const da = normalizeRmDigits(a);
  const db = normalizeRmDigits(b);
  if (da.length >= RM_LOOKUP_MIN_LEN && da === db) return true;
  return false;
}

function coerceKelasPerawatan(raw: string | undefined): Pasien["kelasPerawatan"] {
  const k = String(raw ?? "").trim();
  if (k === "Kelas 1" || k === "1") return "Kelas 1";
  if (k === "Kelas 3" || k === "3") return "Kelas 3";
  return "Kelas 2";
}

function coerceJenisPembiayaan(raw: string | undefined): Pasien["jenisPembiayaan"] {
  const v = String(raw ?? "").trim();
  if (v === "BPJS" || v === "NPBI" || v === "Umum" || v === "Asuransi") return v;
  return "Umum";
}

function patientToFormFields(p: Pasien): Omit<Pasien, "id"> {
  return {
    noRM: String(p.noRM ?? "").trim(),
    nama: normalizeNamaPasienInput(p.nama ?? ""),
    jenisKelamin: p.jenisKelamin === "P" ? "P" : "L",
    tanggalLahir: formatTanggalLahirFromDb(p.tanggalLahir),
    alamat: p.alamat ?? "",
    noHP: String(p.noHP ?? "").trim(),
    jenisPembiayaan: coerceJenisPembiayaan(p.jenisPembiayaan),
    kelasPerawatan: coerceKelasPerawatan(p.kelasPerawatan),
    asuransi: p.asuransi ?? "",
  };
}

async function fetchPasienByNoRm(rm: string): Promise<Pasien | null> {
  const res = await fetch(
    `/api/pasien?noRm=${encodeURIComponent(rm)}`,
    { credentials: "include" },
  );
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: Pasien | null;
  };
  if (!json?.ok || !json.data?.id) return null;
  return json.data;
}

export default function TambahPasienQuickModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (patient: Pasien) => Promise<void> | void;
}) {
  const [formData, setFormData] = useState<Omit<Pasien, "id">>(initialForm);
  const [matchedPatient, setMatchedPatient] = useState<Pasien | null>(null);
  const [rmChecking, setRmChecking] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const rmInputRef = useRef(formData.noRM);
  rmInputRef.current = formData.noRM;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const umurTeks = useMemo(() => {
    const t = formatTanggalLahirFromDb(formData.tanggalLahir?.trim() ?? "");
    if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return "—";
    return hitungUsia(t).teks;
  }, [formData.tanggalLahir]);

  useEffect(() => {
    if (!open) return;
    setFormData(initialForm());
    setMatchedPatient(null);
    setError("");
    setRmChecking(false);
    setLoading(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const rmTyped = formData.noRM.trim();
    if (rmTyped.length < RM_LOOKUP_MIN_LEN) {
      setMatchedPatient(null);
      setRmChecking(false);
      return;
    }

    setRmChecking(true);
    debounceRef.current = setTimeout(() => {
      const lookupRm = rmInputRef.current.trim();
      if (lookupRm.length < RM_LOOKUP_MIN_LEN) {
        setMatchedPatient(null);
        setRmChecking(false);
        return;
      }

      void (async () => {
        try {
          const found = await fetchPasienByNoRm(lookupRm);
          if (rmInputRef.current.trim() !== lookupRm) return;
          if (found && rmEquivalent(found.noRM, lookupRm)) {
            setMatchedPatient(found);
            setFormData(patientToFormFields(found));
          } else {
            setMatchedPatient(null);
          }
        } catch {
          if (rmInputRef.current.trim() === lookupRm) setMatchedPatient(null);
        } finally {
          if (rmInputRef.current.trim() === lookupRm) setRmChecking(false);
        }
      })();
    }, RM_LOOKUP_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, formData.noRM]);

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

    setLoading(true);
    setError("");
    try {
      let existing = matchedPatient;
      const rmNow = formData.noRM.trim();
      if (!existing || !rmEquivalent(existing.noRM, rmNow)) {
        const hit = await fetchPasienByNoRm(rmNow);
        if (hit && rmEquivalent(hit.noRM, rmNow)) existing = hit;
        else existing = null;
      }

      if (existing) {
        const tanggalLahirIso = formatTanggalLahirFromDb(
          formData.tanggalLahir.trim(),
        );
        const updatePayload = {
          ...formData,
          nama: namaFinal,
          tanggalLahir: tanggalLahirIso,
          noHP: (formData.noHP ?? "").trim(),
          noRM: rmNow,
        };

        const parsedUpdate = pasienSchema.safeParse(updatePayload);
        if (!parsedUpdate.success) {
          setError(
            formatPasienApiValidationError({
              error: parsedUpdate.error.flatten(),
            }),
          );
          return;
        }

        const putRes = await fetch(
          `/api/pasien/${encodeURIComponent(existing.id)}/edit`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(parsedUpdate.data),
          },
        );
        const putJson = (await putRes.json().catch(() => ({}))) as {
          ok?: boolean;
          data?: Pasien;
        };
        if (!putRes.ok || !putJson?.ok || !putJson.data) {
          throw new Error(formatPasienApiValidationError(putJson));
        }

        onClose();
        await onSaved(putJson.data);
        return;
      }

      const tanggalLahirIso = formatTanggalLahirFromDb(
        formData.tanggalLahir.trim(),
      );
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

  if (!open) return null;

  const primaryLabel = matchedPatient
    ? "Tambah kasus tindakan"
    : "💾 Simpan";
  const primaryLoadingLabel = matchedPatient
    ? "Memperbarui master & menambah kasus…"
    : "⏳ Menyimpan…";

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

          {matchedPatient ? (
            <p
              className="text-xs text-amber-200/95 mb-3 rounded-lg border border-amber-500/35 bg-amber-950/35 px-3 py-2 leading-relaxed"
              role="status"
            >
              No. RM ini sudah ada di master pasien — formulir diisi otomatis. Anda
              boleh melengkapi atau mengoreksi data (misalnya No. HP, alamat) sebelum
              menyimpan; perubahan akan disimpan ke master pasien. Untuk kunjungan
              atau jenis tindakan baru, gunakan{" "}
              <span className="font-medium text-amber-100">
                Tambah kasus tindakan
              </span>{" "}
              (tidak membuat pasien ganda).
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <InputField
                label="No. RM"
                name="noRM"
                value={formData.noRM}
                onChange={handleChange}
                autoComplete="off"
              />
              {rmChecking ? (
                <p className="text-[10px] text-cyan-500/85 mt-0.5 font-mono">
                  Memeriksa No. RM…
                </p>
              ) : null}
            </div>
            <InputField
              label="Nama"
              name="nama"
              value={formData.nama}
              onChange={handleChange}
              autoComplete="name"
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
              autoComplete="street-address"
            />
            <InputField
              label="No. HP"
              name="noHP"
              value={formData.noHP}
              onChange={handleChange}
              colSpan
              autoComplete="tel"
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
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-cyan-600/60 hover:bg-cyan-500/80 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,255,255,0.5)] hover:shadow-[0_0_20px_rgba(0,255,255,0.8)] transition-all disabled:opacity-60"
            >
              {loading ? primaryLoadingLabel : primaryLabel}
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
  autoComplete,
}: {
  label: string;
  name: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  type?: string;
  colSpan?: boolean;
  placeholder?: string;
  autoComplete?: string;
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
        autoComplete={autoComplete}
        className="w-full px-3 py-2 mt-1 bg-black/30 border border-cyan-600/50 rounded-lg focus:outline-none focus:border-yellow-400 [color-scheme:dark]"
      />
    </div>
  );
}


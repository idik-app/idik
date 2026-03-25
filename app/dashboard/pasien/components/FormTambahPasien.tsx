"use client";

import { useState } from "react";
import { usePasien } from "../contexts/PasienContext";
import { addPatientClient } from "../actions/addPatientClient";
import ModalWrapper from "@/components/global/ModalWrapper";
import PasienFormFields from "../components/PasienFormFields";
import PasienFormActions from "../components/PasienFormActions";
import {
  normalizeNamaPasienInput,
} from "../utils/normalizeNamaPasien";

/**
 * 🧠 FormTambahPasien v6.1 — Modular & Stable
 * - Gunakan komponen terpisah untuk field dan konfirmasi
 * - Sinkron penuh dengan kolom Supabase (no_rm, nama, jk, tgl_lahir, alamat, no_telp, pembiayaan, kelas, asuransi)
 */
export default function FormTambahPasien() {
  const { modalMode, closeModal } = usePasien();
  if (modalMode !== "add") return null;

  const [form, setForm] = useState({
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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const nextVal =
      name === "nama" ? normalizeNamaPasienInput(value) : (value as string);
    setForm((prev) => ({
      ...prev,
      [name]: name === "jenisKelamin" ? (value as "L" | "P") : nextVal,
      kelasPerawatan:
        name === "jenisPembiayaan" && value === "NPBI"
          ? "Kelas 3"
          : prev.kelasPerawatan,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addPatientClient(form);
      setNotif("✅ Data pasien berhasil disimpan ke Supabase.");
      setTimeout(() => closeModal(), 1200);
    } catch (err: any) {
      console.error("❌ Gagal menyimpan pasien:", err);
      setNotif(
        "⚠️ Gagal menyimpan. Periksa koneksi atau struktur tabel Supabase."
      );
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <ModalWrapper onClose={closeModal} title="Tambah Pasien">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setConfirmOpen(true);
        }}
        className="space-y-4 text-sm text-gray-100 bg-[#0a0f1a] p-4 rounded-2xl border border-cyan-700/40 shadow-inner"
      >
        {/* 🔹 Input Field terpisah */}
        <PasienFormFields form={form} handleChange={handleChange} />

        {/* 🔹 Tombol & Konfirmasi */}
        <PasienFormActions
          onCancel={closeModal}
          onSubmit={handleSubmit}
          confirmOpen={confirmOpen}
          setConfirmOpen={setConfirmOpen}
          loading={loading}
          notif={notif}
        />
      </form>
    </ModalWrapper>
  );
}

"use client";

import ModalWrapper from "@/components/global/ModalWrapper";
import { usePasien } from "../contexts/PasienContext";
import { addPatientClient } from "../actions/addPatientClient"; // ✅ wrapper client
import { useState } from "react";

export default function FormTambahPasien() {
  const { modalMode, closeModal } = usePasien(); // ❌ jangan panggil server action dari context

  const [form, setForm] = useState({
    nama: "",
    noRM: "",
    jenisKelamin: "L",
    tanggalLahir: "",
    alamat: "",
    noHP: "",
    jenisPembiayaan: "Umum",
    kelasPerawatan: "Kelas 2",
    asuransi: "",
  });

  if (modalMode !== "add") return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "jenisKelamin" ? (value as "L" | "P") : (value as string),
      kelasPerawatan:
        name === "jenisPembiayaan" && value === "BPJS PBI"
          ? "Kelas 3"
          : prev.kelasPerawatan,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPatientClient(form); // ✅ panggil melalui wrapper client
    closeModal();
  };

  return (
    <ModalWrapper onClose={closeModal}>
      {/* ...semua isi form tetap sama... */}
    </ModalWrapper>
  );
}

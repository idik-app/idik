"use client";
import React from "react";

interface Props {
  form: any;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
}

export default function PasienFormFields({ form, handleChange }: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="noRM"
          placeholder="No. RM"
          value={form.noRM}
          onChange={handleChange}
          required
          className="rounded-md px-3 py-2 bg-gray-900/60 border border-cyan-800 focus:outline-none"
        />
        <input
          name="nama"
          placeholder="Nama"
          value={form.nama}
          onChange={handleChange}
          required
          className="rounded-md px-3 py-2 bg-gray-900/60 border border-cyan-800 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select
          name="jenisKelamin"
          value={form.jenisKelamin}
          onChange={handleChange}
          className="rounded-md px-3 py-2 bg-gray-900/60 border border-cyan-800 focus:outline-none"
        >
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>

        <input
          type="date"
          name="tanggalLahir"
          value={form.tanggalLahir}
          onChange={handleChange}
          className="rounded-md px-3 py-2 bg-gray-900/60 border border-cyan-800 focus:outline-none"
        />
      </div>

      <input
        name="alamat"
        placeholder="Alamat"
        value={form.alamat}
        onChange={handleChange}
        className="w-full rounded-md px-3 py-2 bg-gray-900/60 border border-cyan-800 focus:outline-none"
      />

      <input
        name="noHP"
        placeholder="No. HP"
        value={form.noHP}
        onChange={handleChange}
        className="w-full rounded-md px-3 py-2 bg-gray-900/60 border border-cyan-800 focus:outline-none"
      />

      <div className="grid grid-cols-3 gap-3">
        <select
          name="jenisPembiayaan"
          value={form.jenisPembiayaan}
          onChange={handleChange}
          className="rounded-md px-3 py-2 bg-gray-900/60 border border-cyan-800 focus:outline-none"
        >
          <option>Umum</option>
          <option>BPJS PBI</option>
          <option>BPJS Non PBI</option>
          <option>Asuransi</option>
        </select>

        <select
          name="kelasPerawatan"
          value={form.kelasPerawatan}
          onChange={handleChange}
          className="rounded-md px-3 py-2 bg-gray-900/60 border border-cyan-800 focus:outline-none"
        >
          <option>Kelas 1</option>
          <option>Kelas 2</option>
          <option>Kelas 3</option>
        </select>

        <input
          name="asuransi"
          placeholder="Asuransi (jika ada)"
          value={form.asuransi}
          onChange={handleChange}
          className="rounded-md px-3 py-2 bg-gray-900/60 border border-cyan-800 focus:outline-none"
        />
      </div>
    </>
  );
}

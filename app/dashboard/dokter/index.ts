// ===============================
// 📁 app/dashboard/dokter/index.ts
// ===============================

// Ekspor hook utama dari context dokter
export { useDoctor } from "./contexts/DokterContext";

// Ekspor komponen utama tabel/list dokter
export { default as DokterTable } from "./DoctorContent-"; // ✅ bukan DokterContent

// Jika kamu punya helper format nama dokter, aktifkan baris di bawah.
// export { default as formatNama } from "./utils/formatNama";

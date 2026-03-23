// ===============================
// 📁 app/dashboard/dokter/index.ts
// ===============================

// Ekspor hook utama dari context dokter
export { useDokter, useDoctor } from "./contexts/DokterContext";

// Ekspor komponen utama tabel/list dokter
export { default as DokterTable } from "./components/DokterContent";

// Jika kamu punya helper format nama dokter, aktifkan baris di bawah.
// export { default as formatNama } from "./utils/formatNama";

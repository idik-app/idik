import { formatTanggalLahirFromDb } from "../data/pasienSchema";

export function hitungUsia(tanggalLahir: string) {
  const raw = String(tanggalLahir ?? "").trim();
  if (!raw) return { angka: 0, teks: "-" };

  const iso = formatTanggalLahirFromDb(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { angka: 0, teks: "-" };

  const y = Number(iso.slice(0, 4));
  const mo = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  const lahir = new Date(y, mo - 1, d);
  if (!Number.isFinite(lahir.getTime())) return { angka: 0, teks: "-" };

  const sekarang = new Date();
  let usia = sekarang.getFullYear() - lahir.getFullYear();
  const bulan = sekarang.getMonth() - lahir.getMonth();
  const hari = sekarang.getDate() - lahir.getDate();
  if (bulan < 0 || (bulan === 0 && hari < 0)) usia--;

  const teks = `${usia} TH`;
  return { angka: usia, teks };
}

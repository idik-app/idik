/**
 * Kode master barang otomatis: mudah dibaca (bukan base36 acak).
 * Format: DM-{NAMA-SINGKAT}-{YYYYMMDD}-{4 digit acak}
 * Contoh: DM-GENOSS-20260320-4821
 */

export function slugifyForMasterKode(nama: string): string {
  const s = nama
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  return s.slice(0, 20) || "ITEM";
}

export function generateDefaultMasterKode(nama: string): string {
  const slug = slugifyForMasterKode(nama);
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `DM-${slug}-${y}${m}${day}-${rnd}`;
}

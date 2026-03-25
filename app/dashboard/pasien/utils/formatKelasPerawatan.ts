/**
 * Tampilan ringkas kelas perawatan: hanya angka 1, 2, 3.
 * Nilai internal tetap "Kelas 1" | "Kelas 2" | "Kelas 3".
 */
export function formatKelasPerawatanDisplay(
  raw: string | undefined | null
): string {
  const s = String(raw ?? "").trim();
  const m = s.match(/^Kelas\s*(\d)$/i);
  if (m) return m[1]!;
  if (/^[123]$/.test(s)) return s;
  return s || "—";
}

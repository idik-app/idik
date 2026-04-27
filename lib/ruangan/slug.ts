/**
 * Slug untuk URL `/{slug}/dashboard`. Huruf kecil, angka, tanda hubung.
 */
export function normalizeRuanganSlugInput(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim().toLowerCase();
  if (s.length === 0) return null;
  if (s.length > 64) return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return null;
  return s;
}

/** Label tampilan fallback dari path slug (bila `nama` master belum tersedia). */
export function roomDisplayLabelFromSlug(slug: string): string {
  const s = String(slug ?? "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
  if (!s) return "UNIT";
  return s.toUpperCase();
}

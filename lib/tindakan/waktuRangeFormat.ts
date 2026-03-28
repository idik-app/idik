/**
 * Format tampilan Waktu: jam–menit dengan titik, rentang "07.00 - 12.00".
 * Kolom DB: text (bukan time) agar mendukung rentang.
 */

const RANGE_SPLIT = /\s*-\s*/;

/** Satu token jam; terima : atau . sebagai pemisah; detik diabaikan di tampilan. */
function normalizeClockToken(part: string): string {
  const t = part.trim();
  if (!t) return "";
  const m = t.match(/^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?$/);
  if (!m) return t;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, "0")}.${String(min).padStart(2, "0")}`;
}

/** Untuk tampilan drawer / tabel / editor. */
export function formatWaktuDisplay(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const s = String(value).trim();
  if (!s) return "";
  if (RANGE_SPLIT.test(s)) {
    return s
      .split(RANGE_SPLIT)
      .map((p) => normalizeClockToken(p.trim()))
      .filter(Boolean)
      .join(" - ");
  }
  return normalizeClockToken(s);
}

/** Nilai untuk disimpan (trim + jarak konsisten di sekitar "-"). */
export function formatWaktuForApi(raw: string): string | null {
  const displayed = formatWaktuDisplay(raw.trim());
  if (!displayed) return null;
  return displayed.replace(RANGE_SPLIT, " - ");
}

/** Perbandingan stabil untuk autosave (canonical string). */
export function waktuCanonical(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (!s) return "";
  return formatWaktuForApi(s) ?? "";
}

export function waktuDisplayEquals(apiVal: unknown, draft: string): boolean {
  return waktuCanonical(apiVal) === waktuCanonical(draft);
}

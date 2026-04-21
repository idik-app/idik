/**
 * Normalisasi tanggal baris tindakan ke `YYYY-MM-DD` menurut kalender Asia/Jakarta.
 * Menangani nilai ISO datetime (UTC) agar tidak bergeser ±1 hari dibanding kalender RS.
 */
export function tanggalBarisKeYmdWib(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return s.slice(0, 10);
}

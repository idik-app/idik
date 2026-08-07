/**
 * Normalisasi nilai SIMRS → format idik (datetime-local, tanggal, teks).
 */

/** Coba parse berbagai format RS Indonesia / ExtJS → YYYY-MM-DDTHH:mm */
export function normalizeToDatetimeLocal(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}T${iso[4]}:${iso[5]}`;
  }

  // 16-May-2007 or 16-May-2007 14:30
  const monMap: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const dMy = t.match(
    /^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/,
  );
  if (dMy) {
    const mon = monMap[dMy[2].toLowerCase()];
    if (mon) {
      const dd = dMy[1].padStart(2, "0");
      const hh = (dMy[4] || "00").padStart(2, "0");
      const mi = (dMy[5] || "00").padStart(2, "0");
      return `${dMy[3]}-${mon}-${dd}T${hh}:${mi}`;
    }
  }

  // 07/08/2026 14:30 or 07-08-2026
  const dmy = t.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/,
  );
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    const hh = (dmy[4] || "00").padStart(2, "0");
    const mi = (dmy[5] || "00").padStart(2, "0");
    return `${dmy[3]}-${mm}-${dd}T${hh}:${mi}`;
  }

  let normalized = t;
  if (
    t.includes("T") &&
    !t.includes("Z") &&
    !t.includes("+") &&
    !/-\d{2}:\d{2}$/.test(t)
  ) {
    normalized = t.replace("T", " ");
  }
  const ms = Date.parse(normalized);
  if (!Number.isFinite(ms)) return null;
  const dt = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

/** Field datetime idik */
const DATETIME_KEYS = new Set([
  "pasien_datang_igd",
  "door_to_balloon",
  "fast_track_sign_in",
  "fast_track_time_out",
  "fast_track_sign_out",
  "tanggal_tindakan",
]);

const DATE_KEYS = new Set(["tgl_lahir", "tanggal"]);

export function normalizeFieldValue(
  fieldKey: string,
  raw: string,
): { raw: string; normalized: string } {
  const t = raw.trim();
  if (DATETIME_KEYS.has(fieldKey)) {
    const n = normalizeToDatetimeLocal(t);
    return { raw: t, normalized: n ?? t };
  }
  if (DATE_KEYS.has(fieldKey)) {
    const n = normalizeToDatetimeLocal(t);
    if (n) return { raw: t, normalized: n.slice(0, 10) };
  }
  return { raw: t, normalized: t };
}

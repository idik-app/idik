/**
 * Fluoro time: simpan di DB sebagai detik total (numeric), tampil/edit sebagai H:MM:SS (mis. 0:10:45).
 */

export function formatFluoroSecondsToHms(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "";
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function parseFluoroHmsToSeconds(
  raw: string,
): { ok: true; seconds: number | null } | { ok: false } {
  const t = raw.trim();
  if (!t) return { ok: true, seconds: null };

  if (t.includes(":")) {
    const parts = t.split(":").map((p) => p.trim());
    if (parts.some((p) => p === "")) return { ok: false };
    const nums = parts.map((p) => {
      const n = parseInt(p, 10);
      return Number.isFinite(n) ? n : NaN;
    });
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) return { ok: false };

    if (parts.length === 3) {
      const [h, m, s] = nums;
      if (m > 59 || s > 59) return { ok: false };
      return { ok: true, seconds: h * 3600 + m * 60 + s };
    }
    if (parts.length === 2) {
      const [m, s] = nums;
      if (s > 59) return { ok: false };
      return { ok: true, seconds: m * 60 + s };
    }
    return { ok: false };
  }

  const n = Number(t.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return { ok: false };
  return { ok: true, seconds: Math.round(n) };
}

export function fluoroSecondsFromApiValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const p = parseFluoroHmsToSeconds(String(value));
  return p.ok && p.seconds != null ? p.seconds : null;
}

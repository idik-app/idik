/** Parse kolom `fast_track_fotos` (JSON array URL) — dipakai modal & template cetak. */
export function parseFastTrackFotosUrls(raw: unknown): string[] {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) {
    return raw.filter(
      (x): x is string =>
        typeof x === "string" &&
        (x.startsWith("http://") || x.startsWith("https://")),
    );
  }
  const s = String(raw).trim();
  if (!s) return [];
  try {
    const j = JSON.parse(s) as unknown;
    if (!Array.isArray(j)) return [];
    return j.filter(
      (x): x is string =>
        typeof x === "string" &&
        (x.startsWith("http://") || x.startsWith("https://")),
    );
  } catch {
    if (s.startsWith("http://") || s.startsWith("https://")) return [s];
    return [];
  }
}

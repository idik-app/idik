/** Jangan log NIK / alamat lengkap ke terminal. */
export function redactPii(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  if (/^\d{16}$/.test(s)) return `${s.slice(0, 4)}********${s.slice(-4)}`;
  if (s.length > 24) return `${s.slice(0, 12)}…`;
  return s;
}

export function safePatientSummary(data: {
  norm?: string;
  nama?: string;
}): string {
  const rm = data.norm ?? "?";
  const nama = data.nama
    ? data.nama
        .split(/\s+/)
        .map((p, i) => (i === 0 ? p : `${p[0] ?? ""}.`))
        .join(" ")
    : "?";
  return `RM ${rm} (${nama})`;
}

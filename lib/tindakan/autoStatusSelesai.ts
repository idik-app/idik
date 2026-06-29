/** Nilai placeholder UI/DB yang dianggap belum terisi. */
function isPlaceholderTindakanValue(value: unknown): boolean {
  const s = String(value ?? "").trim();
  if (!s) return true;
  const lower = s.toLowerCase().replace(/\s+/g, " ");
  if (lower === "—" || lower === "-") return true;
  if (lower === "belum diisi" || lower === "belum ditentukan") return true;
  if (lower.includes("belum")) return true;
  return false;
}

export function isCoreTindakanFieldFilled(value: unknown): boolean {
  return !isPlaceholderTindakanValue(value);
}

const PROTECTED_AUTO_STATUS = new Set(["dibatalkan", "meninggal"]);

export function isProtectedAutoStatus(status: unknown): boolean {
  const s = String(status ?? "").trim().toLowerCase();
  return PROTECTED_AUTO_STATUS.has(s);
}

/** Dokter + tindakan + ruangan terisi → siap auto-status Selesai. */
export function isReadyForAutoStatusSelesai(row: {
  dokter?: unknown;
  tindakan?: unknown;
  ruangan?: unknown;
  status?: unknown;
}): boolean {
  if (isProtectedAutoStatus(row.status)) return false;
  if (String(row.status ?? "").trim() === "Selesai") return false;
  return (
    isCoreTindakanFieldFilled(row.dokter) &&
    isCoreTindakanFieldFilled(row.tindakan) &&
    isCoreTindakanFieldFilled(row.ruangan)
  );
}

export function buildAutoSelesaiStatusUpdates(
  merged: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!isReadyForAutoStatusSelesai(merged)) return null;
  return { status: "Selesai", status_keterangan: null };
}

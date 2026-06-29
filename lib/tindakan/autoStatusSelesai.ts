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

export function resolveDokterForAutoStatus(
  row: Record<string, unknown>,
): unknown {
  return row.dokter ?? row.operator;
}

const PROTECTED_AUTO_STATUS = new Set(["dibatalkan", "meninggal"]);

/** Status yang boleh di-promote otomatis ke Selesai (mis. Menunggu, Pending, Proses). */
const AUTO_SELESAI_FROM = new Set([
  "",
  "menunggu",
  "pending",
  "proses",
]);

export function isProtectedAutoStatus(status: unknown): boolean {
  const s = String(status ?? "").trim().toLowerCase();
  return PROTECTED_AUTO_STATUS.has(s);
}

function canPromoteStatusToSelesai(status: unknown): boolean {
  const s = String(status ?? "").trim();
  if (!s) return true;
  const lower = s.toLowerCase();
  if (lower === "selesai") return false;
  if (isProtectedAutoStatus(s)) return false;
  return (
    AUTO_SELESAI_FROM.has(lower) ||
    lower.includes("tunggu") ||
    lower.includes("menunggu")
  );
}

/** Dokter + tindakan + ruangan terisi → siap auto-status Selesai (semua pasien/baris). */
export function isReadyForAutoStatusSelesai(
  row: Record<string, unknown>,
): boolean {
  if (!canPromoteStatusToSelesai(row.status)) return false;
  return (
    isCoreTindakanFieldFilled(resolveDokterForAutoStatus(row)) &&
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

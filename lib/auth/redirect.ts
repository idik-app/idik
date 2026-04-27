export function normalizeRole(role: unknown): string {
  return String(role ?? "")
    .trim()
    .toLowerCase();
}

/** Role yang jika punya `ruangan_slug` di JWT diarahkan ke `/{slug}/dashboard`. */
const ROLES_UNIT_HOME = new Set([
  "perawat",
  "dokter",
  "radiografer",
  "casemix",
  "admin",
  "administrator",
  "staff", // legacy → perilaku sama perawat untuk path unit
  /** Cathlab / IDIK — home unit `idik` (selaras `lib/intensive/resolveRoomSlug.ts`). */
  "cathlab",
]);

/**
 * Role yang boleh mengakses segmen URL `/{unitSlug}/...` (middleware).
 * Wajib mencakup semua role yang bisa dibuka setelah login ke unit (`ROLES_UNIT_HOME`)
 * plus role operasional unit dari `requireUnitAccess` (mis. `it`, `analis`) dan akses admin penuh.
 */
export const UNIT_DYNAMIC_PATH_ALLOWED_ROLES: ReadonlySet<string> = new Set([
  ...ROLES_UNIT_HOME,
  "analis",
  "it",
  "superadmin",
]);

function normalizeUnitSlug(slug: unknown): string | null {
  const s = typeof slug === "string" ? slug.trim() : "";
  return s.length > 0 ? s : null;
}

/**
 * Redirect target setelah login sesuai audit level.
 * Keep this in one place so API + root redirect stay consistent.
 */
export function getRedirectTargetForRole(
  role: unknown,
  opts?: { ruanganSlug?: string | null }
): string {
  const r = normalizeRole(role);
  const slug = normalizeUnitSlug(opts?.ruanganSlug ?? null);

  if (slug && ROLES_UNIT_HOME.has(r)) {
    return `/${slug}/dashboard`;
  }

  const routeMap: Record<string, string> = {
    pasien: "/dashboard",
    dokter: "/dashboard/dokter",
    perawat: "/dashboard/layanan/tindakan",
    staff: "/dashboard/layanan/tindakan", // legacy (pre-migration) — selaras perawat
    /** Tanpa `ruangan_slug` di JWT, tetap ke dashboard unit IDIK/Cathlab. */
    cathlab: "/idik/dashboard",
    it: "/system",
    radiografer: "/dashboard/layanan/hasil",
    casemix: "/dashboard/laporan",
    distributor: "/distributor/dashboard",
    vendor: "/distributor/dashboard", // legacy (pre-migration)
    depo_farmasi: "/depo/dashboard",
    depo: "/depo/dashboard", // legacy (pre-migration)
    farmasi: "/depo/dashboard", // legacy (pre-migration)
    pharmacy: "/depo/dashboard", // legacy (pre-migration)
    admin: "/dashboard",
    administrator: "/dashboard",
    superadmin: "/dashboard",
  };

  return routeMap[r] || "/dashboard";
}


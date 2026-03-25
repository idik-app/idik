export function normalizeRole(role: unknown): string {
  return String(role ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Redirect target setelah login sesuai audit level.
 * Keep this in one place so API + root redirect stay consistent.
 */
export function getRedirectTargetForRole(role: unknown): string {
  const r = normalizeRole(role);

  const routeMap: Record<string, string> = {
    pasien: "/dashboard",
    dokter: "/dashboard/dokter",
    perawat: "/dashboard/pasien",
    staff: "/dashboard/pasien", // legacy (pre-migration)
    it: "/system",
    radiografer: "/dashboard/layanan/hasil",
    casemix: "/dashboard/laporan",
    distributor: "/distributor/dashboard",
    vendor: "/distributor/dashboard", // legacy (pre-migration)
    depo_farmasi: "/depo/dashboard",
    depo: "/depo/dashboard", // legacy (pre-migration)
    farmasi: "/depo/dashboard", // legacy (pre-migration)
    pharmacy: "/depo/dashboard", // legacy (pre-migration)
    admin: "/dashboard/admin",
    administrator: "/dashboard/admin",
    superadmin: "/dashboard/admin",
  };

  return routeMap[r] || "/dashboard";
}


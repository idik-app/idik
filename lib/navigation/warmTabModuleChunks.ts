/**
 * Preload modul page yang sama dipakai TabContent (next/dynamic).
 * Dijalankan saat browser idle agar chunk JS + parse sudah di cache
 * sebelum user mengklik tab (bukan jalan kritis LCP).
 */

export type TabModuleLoader = () => Promise<unknown>;

/** Urutan: modul paling sering dulu, lalu batch paralel kecil, sisanya sekuensial ringan. */
const CRITICAL_PARALLEL: readonly TabModuleLoader[] = [
  () => import("@/app/dashboard/layanan/tindakan/page"),
  () => import("@/app/dashboard/pasien/page"),
  () => import("@/app/dashboard/page"),
];

const REST_SEQUENTIAL: readonly TabModuleLoader[] = [
  () => import("@/app/dashboard/layanan/tindakan/components/PemakaianAlkesModal"),
  () => import("@/app/dashboard/pemakaian/page"),
  () => import("@/app/dashboard/inventaris/page"),
  () => import("@/app/dashboard/farmasi/master-barang/page"),
  () => import("@/app/dashboard/layanan/master-tindakan/page"),
  () => import("@/app/dashboard/laporan/page"),
  () => import("@/app/dashboard/settings/page"),
  () => import("@/app/dashboard/dokter/page"),
  () => import("@/app/dashboard/ruangan/page"),
  () => import("@/app/dashboard/perawat/page"),
  () => import("@/app/dashboard/farmasi/master/page"),
  () => import("@/app/dashboard/smart/monitoring/page"),
  () => import("@/app/dashboard/admin/page"),
  () => import("@/app/dashboard/cathlab/koronar-3d/page"),
  () => import("@/app/dashboard/smart/analytics/page"),
  () => import("@/app/cssd/dashboard/page"),
  () => import("@/app/system/page"),
  () => import("@/app/system/database/page"),
];

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Promise<void> agar jelas non-blocking untuk caller. */
export async function warmTabModuleChunks(): Promise<void> {
  await Promise.allSettled(CRITICAL_PARALLEL.map((fn) => fn()));
  await wait(50);
  for (const fn of REST_SEQUENTIAL) {
    try {
      await fn();
    } catch {
      // modul error build/tipe — jangan bocor ke UI
    }
    await wait(45);
  }
}

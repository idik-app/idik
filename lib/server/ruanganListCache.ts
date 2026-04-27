/** Cache daftar ruangan untuk GET /api/ruangan (server-only). */

let ruanganCache: unknown[] | null = null;
let ruanganCacheExpires = 0;

const TTL_MS = 300_000;

/** Daftar cache jika masih valid; jika tidak, `null`. */
export function getRuanganListCacheIfValid(): unknown[] | null {
  const now = Date.now();
  if (ruanganCache && now < ruanganCacheExpires) return ruanganCache;
  return null;
}

export function setRuanganListCache(rows: unknown[]) {
  ruanganCache = rows;
  ruanganCacheExpires = Date.now() + TTL_MS;
}

export function invalidateRuanganListCache() {
  ruanganCache = null;
  ruanganCacheExpires = 0;
}

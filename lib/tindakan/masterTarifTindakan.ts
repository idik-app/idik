/**
 * Master tarif tindakan — kunci pencarian diseragamkan dengan
 * `public.normalize_nama_tindakan_tarif` di migrasi SQL.
 */

export function normalizeNamaTindakanTarifKey(
  raw: string | null | undefined,
): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function buildMasterTarifMapFromRows(
  rows: ReadonlyArray<{ nama_cari: string; tarif_rupiah: unknown }>,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = normalizeNamaTindakanTarifKey(r.nama_cari);
    if (!k) continue;
    const n =
      typeof r.tarif_rupiah === "number"
        ? r.tarif_rupiah
        : Number(
            String(r.tarif_rupiah ?? "")
              .replace(/\s/g, "")
              .replace(",", "."),
          );
    if (Number.isFinite(n)) m.set(k, n);
  }
  return m;
}

export function lookupMasterTarifRupiah(
  map: ReadonlyMap<string, number>,
  tindakanRaw: unknown,
): number | null {
  const k = normalizeNamaTindakanTarifKey(
    tindakanRaw === null || tindakanRaw === undefined
      ? ""
      : String(tindakanRaw),
  );
  if (!k) return null;
  const v = map.get(k);
  return v !== undefined ? v : null;
}

/** Jika `tarif_tindakan` di baris kosong, isi dari master (tampilan daftar / detail). */
export function enrichTindakanRowTarifFromMasterMap(
  row: Record<string, unknown>,
  map: ReadonlyMap<string, number>,
): Record<string, unknown> {
  const dbTarif = row.tarif_tindakan;
  const hasDb =
    dbTarif !== null &&
    dbTarif !== undefined &&
    dbTarif !== "" &&
    Number.isFinite(Number(dbTarif));
  if (hasDb) return row;
  const tindakan = row.tindakan ?? row.jenis;
  const hit = lookupMasterTarifRupiah(map, tindakan);
  if (hit === null) return row;
  return { ...row, tarif_tindakan: hit };
}

let tarifCache: Map<string, number> | null = null;
let tarifCacheExpires = 0;

export async function fetchMasterTarifLookupMap(
  supabase: unknown,
): Promise<Map<string, number>> {
  const now = Date.now();
  if (tarifCache && now < tarifCacheExpires) {
    return tarifCache;
  }

  const sb = supabase as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: unknown,
        ) => PromiseLike<{
          data: unknown;
          error: { message?: string } | null;
        }>;
      };
    };
  };
  try {
    const { data, error } = await sb
      .from("master_tarif_tindakan")
      .select("nama_cari,tarif_rupiah")
      .eq("aktif", true);
    if (error) {
      console.warn("[master_tarif_tindakan]", error.message);
      return tarifCache || new Map();
    }
    const rows = Array.isArray(data) ? data : [];
    const map = buildMasterTarifMapFromRows(
      rows as { nama_cari: string; tarif_rupiah: unknown }[],
    );
    
    // Cache for 5 minutes
    tarifCache = map;
    tarifCacheExpires = now + 5 * 60 * 1000;
    
    return map;
  } catch {
    return tarifCache || new Map();
  }
}

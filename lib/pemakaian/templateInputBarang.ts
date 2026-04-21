import { DISTRIBUTOR_PRODUK_KATEGORI } from "@/lib/distributorCatalog";

/** Satu baris tambahan di tab Komponen cathlab (katalog + PT). */
export type KomponenKatalogBaris = {
  id: string;
  distributorId: string | null;
  distributorNama: string;
  kategori: string;
  namaBarang: string;
};

/** Bentuk tersimpan di kolom `template_input_barang` (JSON). */
export type TemplateInputBarangPayload = {
  obatAlkes: Record<string, string>;
  komponen: Record<string, string>;
  /**
   * Item katalog yang ditambah manual di tab Komponen (selain checklist template).
   * Setelah `normalizeTemplateInputBarang`, selalu ada (boleh array kosong).
   */
  komponenKatalog?: KomponenKatalogBaris[];
};

function toStringMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return Object.fromEntries(
    Object.entries(v as Record<string, unknown>).map(([k, val]) => [
      k,
      String(val ?? ""),
    ]),
  );
}

const KATEGORI_SET = new Set<string>(DISTRIBUTOR_PRODUK_KATEGORI);

function normalizeKomponenKatalog(raw: unknown): KomponenKatalogBaris[] {
  if (!Array.isArray(raw)) return [];
  const out: KomponenKatalogBaris[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const idRaw = o.id;
    const id =
      typeof idRaw === "string" && idRaw.trim()
        ? idRaw.trim()
        : `kkb-${Math.random().toString(36).slice(2, 11)}`;
    let distributorId: string | null = null;
    if (typeof o.distributorId === "string" && o.distributorId.trim()) {
      distributorId = o.distributorId.trim();
    }
    const distributorNama =
      typeof o.distributorNama === "string" ? o.distributorNama.trim() : "";
    const katRaw =
      typeof o.kategori === "string" ? o.kategori.trim().toUpperCase() : "";
    const kategori = KATEGORI_SET.has(katRaw) ? katRaw : "";
    const namaBarang =
      typeof o.namaBarang === "string" ? o.namaBarang.trim() : "";
    if (!namaBarang) continue;
    out.push({
      id,
      distributorId,
      distributorNama,
      kategori,
      namaBarang,
    });
  }
  return out;
}

/** Normalisasi body API / baris DB ke struktur aman. */
export function normalizeTemplateInputBarang(
  raw: unknown,
): TemplateInputBarangPayload {
  if (raw === undefined || raw === null) {
    return { obatAlkes: {}, komponen: {}, komponenKatalog: [] };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { obatAlkes: {}, komponen: {}, komponenKatalog: [] };
  }
  const o = raw as Record<string, unknown>;
  return {
    obatAlkes: toStringMap(o.obatAlkes),
    komponen: toStringMap(o.komponen),
    komponenKatalog: normalizeKomponenKatalog(o.komponenKatalog),
  };
}

/**
 * Entri komponen katalog yang namanya belum dipakai di `takenNamesLower`.
 * Nama yang dipakai ditambahkan ke set (untuk rantai dedupe dengan riwayat/master).
 */
export function komponenKatalogEntriesNotInMaster(
  templateRaw: unknown,
  takenNamesLower: Set<string>,
): KomponenKatalogBaris[] {
  const kk = normalizeTemplateInputBarang(templateRaw).komponenKatalog ?? [];
  const out: KomponenKatalogBaris[] = [];
  const L = (s: string) => s.trim().toLowerCase();
  for (const r of kk) {
    const k = L(r.namaBarang);
    if (!k || takenNamesLower.has(k)) continue;
    takenNamesLower.add(k);
    out.push(r);
  }
  return out;
}

/** Gabung beberapa sumber katalog; dedupe by nama (case-insensitive); urutan argumen = prioritas. */
export function mergeKomponenKatalogLists(
  ...sources: (KomponenKatalogBaris[] | undefined | null)[]
): KomponenKatalogBaris[] {
  const seen = new Set<string>();
  const out: KomponenKatalogBaris[] = [];
  const L = (s: string) => s.trim().toLowerCase();
  for (const src of sources) {
    if (!src) continue;
    for (const r of src) {
      const k = L(r.namaBarang);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}

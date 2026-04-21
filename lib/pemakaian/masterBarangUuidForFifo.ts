const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `allocate_pemakaian_fifo` membutuhkan `p_master_barang_id` bertipe uuid.
 * Jika `id` dari Supabase/JSON berupa **angka** (mis. skema legacy) atau string
 * bukan UUID, PostgREST mengirim nilai ke param uuid → error:
 * `invalid input syntax for type uuid: "3"`.
 */
export function normalizeMasterBarangUuid(id: unknown): string | null {
  if (id === null || id === undefined) return null;
  if (typeof id === "number") return null;
  const s = String(id).trim();
  if (!UUID_RE.test(s)) return null;
  return s.toLowerCase();
}

export type MasterBarangRowRef = {
  id: unknown;
  nama: string;
  created_at?: string | null;
};

/**
 * Cocokkan nama barang ke `master_barang` untuk FIFO.
 * Duplikat nama: pilih baris **terawal `created_at`** (biasanya yang punya stok
 * inventaris), lalu tie-break lexicografis pada UUID. Tanpa tanggal → di belakang.
 */
export function resolveMasterBarangUuidForFifo(
  rows: MasterBarangRowRef[] | null | undefined,
  namaBarang: string,
):
  | { ok: true; masterUuid: string }
  | { ok: false; reason: "not_found" | "legacy_or_invalid_id" } {
  const t = String(namaBarang ?? "").trim().toLowerCase();
  if (!t || !rows?.length) return { ok: false, reason: "not_found" };

  const matches = rows.filter(
    (m) => String(m.nama ?? "").trim().toLowerCase() === t,
  );
  if (matches.length === 0) return { ok: false, reason: "not_found" };

  const candidates: { uuid: string; createdMs: number }[] = [];
  for (const m of matches) {
    const uuid = normalizeMasterBarangUuid(m.id);
    if (!uuid) continue;
    const raw = m.created_at;
    const ms =
      typeof raw === "string" && raw.trim()
        ? Date.parse(raw)
        : Number.NaN;
    const createdMs = Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
    candidates.push({ uuid, createdMs });
  }
  if (candidates.length === 0) return { ok: false, reason: "legacy_or_invalid_id" };

  candidates.sort((a, b) => {
    if (a.createdMs !== b.createdMs) return a.createdMs - b.createdMs;
    return a.uuid.localeCompare(b.uuid);
  });
  return { ok: true, masterUuid: candidates[0].uuid };
}

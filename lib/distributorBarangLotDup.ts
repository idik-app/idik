import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDistributorLotAutoValue } from "@/lib/distributorCatalog";

/**
 * Cek apakah LOT (setelah normalisasi) sudah dipakai baris distributor_barang lain
 * untuk PT yang sama.
 */
export async function findDistributorBarangLotConflict(
  supabase: SupabaseClient,
  args: {
    distributorId: string;
    normalizedLot: string;
    /** PATCH: abaikan baris yang sedang diedit. */
    excludeDistributorBarangId?: string;
    /** POST upsert: abaikan mapping (pt + master) yang sama — boleh tetap pakai LOT itu. */
    allowMasterBarangId?: string;
  },
): Promise<{ id: string } | null> {
  const lotKey = normalizeDistributorLotAutoValue(args.normalizedLot);
  if (!lotKey) return null;

  const { data, error } = await supabase
    .from("distributor_barang")
    .select("id, lot, master_barang_id")
    .eq("distributor_id", args.distributorId);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    if (
      args.excludeDistributorBarangId &&
      String(row.id) === String(args.excludeDistributorBarangId)
    ) {
      continue;
    }
    if (
      args.allowMasterBarangId &&
      String(row.master_barang_id) === String(args.allowMasterBarangId)
    ) {
      continue;
    }
    if (row.lot == null || String(row.lot).trim() === "") continue;
    if (normalizeDistributorLotAutoValue(String(row.lot)) !== lotKey) continue;
    return { id: String(row.id) };
  }
  return null;
}

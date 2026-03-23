import type { SupabaseClient } from "@supabase/supabase-js";

export const ROLES_REQUIRE_DISTRIBUTOR = new Set(["distributor"]);

/** Untuk create user: buat baris master_distributor jika nama_pt diisi, atau pakai distributor_id. */
export async function resolveDistributorIdForCreate(
  supabase: SupabaseClient,
  role: string,
  distributor_id: unknown,
  distributor_nama_pt: unknown
): Promise<
  | { ok: true; distributorId: string | null }
  | { ok: false; message: string }
> {
  if (!ROLES_REQUIRE_DISTRIBUTOR.has(role)) {
    return { ok: true, distributorId: null };
  }
  const namaPt =
    typeof distributor_nama_pt === "string" ? distributor_nama_pt.trim() : "";
  const did =
    typeof distributor_id === "string" && distributor_id.trim()
      ? distributor_id.trim()
      : null;

  if (namaPt) {
    const { data: inserted, error } = await supabase
      .from("master_distributor")
      .insert({ nama_pt: namaPt, is_active: true })
      .select("id")
      .single();
    if (error) {
      return { ok: false, message: error.message || "Gagal membuat distributor" };
    }
    if (!inserted?.id) {
      return { ok: false, message: "Gagal membuat distributor" };
    }
    return { ok: true, distributorId: inserted.id };
  }
  if (did) {
    return { ok: true, distributorId: did };
  }
  return { ok: false, message: "distributor wajib untuk role ini" };
}

export function mapAppUserRow(row: Record<string, unknown>) {
  const nested = row.master_distributor as
    | { nama_pt?: string | null }
    | { nama_pt?: string | null }[]
    | null
    | undefined;
  let nama: string | null = null;
  if (nested && typeof nested === "object") {
    if (Array.isArray(nested)) {
      nama = nested[0]?.nama_pt ?? null;
    } else {
      nama = nested.nama_pt ?? null;
    }
  }
  const { master_distributor: _m, ...rest } = row;
  return { ...rest, distributor_nama_pt: nama };
}

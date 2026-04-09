import type { SupabaseClient } from "@supabase/supabase-js";

export const ROLES_REQUIRE_DISTRIBUTOR = new Set(["distributor"]);

/** Untuk create user: buat baris master_distributor jika nama_pt diisi, atau pakai distributor_id. */
export async function resolveDistributorIdForCreate(
  supabase: SupabaseClient,
  role: string,
  distributor_id: unknown,
  distributor_nama_pt: unknown,
  distributor_is_konsolidasi?: boolean
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
      .insert({
        nama_pt: namaPt,
        is_active: true,
        is_konsolidasi: distributor_is_konsolidasi ?? false,
      })
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
    // Jika memilih yang sudah ada, update status konsolidasinya jika dikirim
    if (distributor_is_konsolidasi !== undefined) {
      await supabase
        .from("master_distributor")
        .update({ is_konsolidasi: !!distributor_is_konsolidasi })
        .eq("id", did);
    }
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
  let isKonsolidasi: boolean | null = null;
  if (nested && typeof nested === "object") {
    if (Array.isArray(nested)) {
      nama = nested[0]?.nama_pt ?? null;
      isKonsolidasi = (nested[0] as any)?.is_konsolidasi ?? null;
    } else {
      nama = nested.nama_pt ?? null;
      isKonsolidasi = (nested as any).is_konsolidasi ?? null;
    }
  }

  const stripPt = (s: string) =>
    s
      .toUpperCase()
      .replace(/^PT\.?\s*/u, "")
      .replace(/\s+/g, " ")
      .trim();

  if (nama) {
    nama = `PT. ${stripPt(nama)}`;
  }

  const { master_distributor: _m, ...rest } = row;
  return {
    ...rest,
    distributor_nama_pt: nama,
    distributor_is_konsolidasi: isKonsolidasi,
  };
}

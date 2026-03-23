import type { SupabaseClient } from "@supabase/supabase-js";

export type ReturAllocation = {
  inventaris_id: string;
  mutasi_id: string;
  qty: number;
};

/**
 * Kurangi stok Cathlab (KELUAR_RETUR) FIFO per master + distributor.
 */
export async function applyReturFifo(
  supabase: SupabaseClient,
  opts: {
    masterBarangId: string;
    distributorId: string;
    qty: number;
    actor: string | null;
    keterangan?: string | null;
  },
): Promise<{ allocations: ReturAllocation[] }> {
  const { masterBarangId, distributorId, qty, actor, keterangan } = opts;
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Jumlah harus lebih dari 0");
  }

  const { data: lines, error: invErr } = await supabase
    .from("inventaris")
    .select("id, stok, created_at")
    .eq("lokasi", "Cathlab")
    .eq("master_barang_id", masterBarangId)
    .eq("distributor_id", distributorId)
    .gt("stok", 0)
    .order("created_at", { ascending: true });

  if (invErr) throw new Error(invErr.message);

  let remaining = qty;
  const allocations: ReturAllocation[] = [];

  try {
    for (const row of lines ?? []) {
      if (remaining <= 0) break;
      const stok = Number((row as { stok: number }).stok ?? 0);
      if (stok <= 0) continue;
      const take = Math.min(remaining, stok);
      const invId = String((row as { id: string }).id);

      const { data: mutasiId, error: rpcErr } = await supabase.rpc(
        "apply_inventaris_stok_mutasi",
        {
          p_inventaris_id: invId,
          p_tipe: "KELUAR_RETUR",
          p_qty_delta: -take,
          p_ref_type: "retur_staging",
          p_ref_id: null,
          p_keterangan: keterangan ?? null,
          p_actor: actor,
        },
      );

      if (rpcErr) throw new Error(rpcErr.message);

      allocations.push({
        inventaris_id: invId,
        mutasi_id: String(mutasiId ?? ""),
        qty: take,
      });
      remaining -= take;
    }

    if (remaining > 0) {
      throw new Error(
        `Stok tidak cukup. Kurang ${remaining} unit untuk retur ini.`,
      );
    }

    return { allocations };
  } catch (e) {
    if (allocations.length > 0) {
      try {
        await reverseReturAllocations(supabase, allocations, actor);
      } catch {
        /* best effort rollback */
      }
    }
    throw e;
  }
}

/**
 * Kembalikan stok (MASUK) untuk alokasi retur staging yang dibatalkan.
 */
export async function reverseReturAllocations(
  supabase: SupabaseClient,
  allocations: ReturAllocation[],
  actor: string | null,
): Promise<void> {
  for (const a of allocations) {
    const { error: rpcErr } = await supabase.rpc(
      "apply_inventaris_stok_mutasi",
      {
        p_inventaris_id: a.inventaris_id,
        p_tipe: "MASUK",
        p_qty_delta: a.qty,
        p_ref_type: "retur_staging_batal",
        p_ref_id: a.mutasi_id ? a.mutasi_id : null,
        p_keterangan: "Batal retur staging — stok dikembalikan",
        p_actor: actor,
      },
    );
    if (rpcErr) throw new Error(rpcErr.message);
  }
}

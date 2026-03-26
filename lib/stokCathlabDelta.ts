import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sesuaikan stok agregat Cathlab untuk satu master + distributor.
 * Positif: MASUK ke baris inventaris tertua. Negatif: FIFO KOREKSI (kurangi).
 */
export async function applyCathlabStokDelta(
  supabase: SupabaseClient,
  opts: {
    masterBarangId: string;
    distributorId: string;
    delta: number;
    actor: string | null;
    keterangan?: string | null;
  },
): Promise<void> {
  const { masterBarangId, distributorId, actor, keterangan } = opts;
  const delta = Number(opts.delta);
  if (!Number.isFinite(delta) || delta === 0) return;
  const rounded = Math.round(delta);
  if (Math.abs(delta - rounded) > 1e-6) {
    throw new Error("Jumlah penyesuaian harus bilangan bulat.");
  }
  const d = rounded;

  if (d > 0) {
    const { data: lines, error } = await supabase
      .from("inventaris")
      .select("id")
      .eq("lokasi", "Cathlab")
      .eq("master_barang_id", masterBarangId)
      .eq("distributor_id", distributorId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) throw new Error(error.message);
    let invId = lines?.[0] ? String((lines[0] as { id: string }).id) : null;

    if (!invId) {
      const { data: mb, error: mbErr } = await supabase
        .from("master_barang")
        .select("nama")
        .eq("id", masterBarangId)
        .maybeSingle();
      if (mbErr) throw new Error(mbErr.message);
      const nama =
        String((mb as { nama?: string } | null)?.nama ?? "").trim() ||
        "Stok Cathlab";
      const { data: ins, error: insErr } = await supabase
        .from("inventaris")
        .insert({
          nama,
          lokasi: "Cathlab",
          master_barang_id: masterBarangId,
          distributor_id: distributorId,
          stok: 0,
          satuan: "pcs",
          updated_at: new Date().toISOString(),
        } as never)
        .select("id")
        .maybeSingle();
      if (insErr) throw new Error(insErr.message);
      invId = ins?.id ? String((ins as { id: string }).id) : null;
      if (!invId) {
        throw new Error("Gagal membuat baris inventaris Cathlab.");
      }
    }

    const { error: rpcErr } = await supabase.rpc(
      "apply_inventaris_stok_mutasi",
      {
        p_inventaris_id: invId,
        p_tipe: "MASUK",
        p_qty_delta: d,
        p_ref_type: "penyesuaian_form_distributor",
        p_ref_id: null,
        p_keterangan: keterangan ?? "Penyesuaian stok Cathlab (+) dari portal distributor",
        p_actor: actor,
      },
    );
    if (rpcErr) throw new Error(rpcErr.message);
    return;
  }

  let remaining = -d;
  const { data: invLines, error: invErr } = await supabase
    .from("inventaris")
    .select("id, stok, created_at")
    .eq("lokasi", "Cathlab")
    .eq("master_barang_id", masterBarangId)
    .eq("distributor_id", distributorId)
    .gt("stok", 0)
    .order("created_at", { ascending: true });

  if (invErr) throw new Error(invErr.message);

  for (const row of invLines ?? []) {
    if (remaining <= 0) break;
    const stok = Number((row as { stok: number }).stok ?? 0);
    if (stok <= 0) continue;
    const take = Math.min(remaining, stok);
    const invId = String((row as { id: string }).id);

    const { error: rpcErr } = await supabase.rpc(
      "apply_inventaris_stok_mutasi",
      {
        p_inventaris_id: invId,
        p_tipe: "KOREKSI",
        p_qty_delta: -take,
        p_ref_type: "penyesuaian_form_distributor",
        p_ref_id: null,
        p_keterangan:
          keterangan ?? "Penyesuaian stok Cathlab (−) dari portal distributor",
        p_actor: actor,
      },
    );
    if (rpcErr) throw new Error(rpcErr.message);
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error(
      `Stok tidak cukup untuk mengurangi ${-d} unit. Kurang ${remaining} unit.`,
    );
  }
}

/** Agregat stok Cathlab (semua baris inventaris) untuk satu master + distributor. */
export async function sumInventarisCathlabAggregate(
  supabase: SupabaseClient,
  opts: { masterBarangId: string; distributorId: string },
): Promise<number> {
  const { data, error } = await supabase
    .from("inventaris")
    .select("stok")
    .eq("lokasi", "Cathlab")
    .eq("master_barang_id", opts.masterBarangId)
    .eq("distributor_id", opts.distributorId);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce(
    (s, r) => s + Number((r as { stok?: number }).stok ?? 0),
    0,
  );
}

/**
 * Samakan stok agregat Cathlab ke nilai target (bilangan bulat ≥ 0)
 * dengan satu atau beberapa mutasi delta.
 */
export async function setCathlabStokToTarget(
  supabase: SupabaseClient,
  opts: {
    masterBarangId: string;
    distributorId: string;
    target: number;
    actor: string | null;
    keterangan?: string | null;
  },
): Promise<void> {
  const target = Math.max(0, Math.round(Number(opts.target)));
  if (!Number.isFinite(target)) {
    throw new Error("Target stok Cathlab tidak valid.");
  }
  const current = await sumInventarisCathlabAggregate(supabase, {
    masterBarangId: opts.masterBarangId,
    distributorId: opts.distributorId,
  });
  const delta = target - Math.round(current);
  if (delta === 0) return;
  await applyCathlabStokDelta(supabase, {
    masterBarangId: opts.masterBarangId,
    distributorId: opts.distributorId,
    delta,
    actor: opts.actor,
    keterangan:
      opts.keterangan ?? "Set stok agregat Cathlab ke nilai target",
  });
}

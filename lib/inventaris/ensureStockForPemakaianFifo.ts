import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sebelum `allocate_pemakaian_fifo`, pastikan jumlah stok tersedia di lokasi
 * untuk `master_barang_id` minimal `qtyNeeded`. Jika kurang, tambahkan selisih
 * ke baris inventaris tertua (FIFO) atau buat baris baru bila belum ada.
 *
 * Memungkinkan simpan pemakaian tanpa gagal ketika stok belum diinput di UI.
 */
export async function ensureInventarisForPemakaianFifo(
  supabase: SupabaseClient,
  opts: {
    masterBarangId: string;
    lokasi: string;
    qtyNeeded: number;
  },
): Promise<
  { ok: true; toppedUp: number } | { ok: false; message: string }
> {
  const { masterBarangId, lokasi, qtyNeeded } = opts;
  if (qtyNeeded <= 0) return { ok: true, toppedUp: 0 };

  const { data: rows, error } = await supabase
    .from("inventaris")
    .select("id, stok, created_at")
    .eq("lokasi", lokasi)
    .eq("master_barang_id", masterBarangId);

  if (error) return { ok: false, message: error.message };

  const total = (rows ?? []).reduce(
    (s, r) => s + Math.max(0, Number(r.stok ?? 0)),
    0,
  );
  const shortfall = qtyNeeded - total;
  if (shortfall <= 0) return { ok: true, toppedUp: 0 };

  if (rows && rows.length > 0) {
    const oldest = [...rows].sort(
      (a, b) =>
        new Date(String(a.created_at ?? 0)).getTime() -
        new Date(String(b.created_at ?? 0)).getTime(),
    )[0];
    const nextStok = Math.max(0, Number(oldest.stok ?? 0)) + shortfall;
    const { error: upErr } = await supabase
      .from("inventaris")
      .update({
        stok: nextStok,
        updated_at: new Date().toISOString(),
      })
      .eq("id", oldest.id);
    if (upErr) return { ok: false, message: upErr.message };
    return { ok: true, toppedUp: shortfall };
  }

  const { data: master, error: mErr } = await supabase
    .from("master_barang")
    .select("nama")
    .eq("id", masterBarangId)
    .maybeSingle();
  if (mErr) return { ok: false, message: mErr.message };
  const nama = String(master?.nama ?? "").trim() || "Barang";

  const { error: insErr } = await supabase.from("inventaris").insert({
    nama,
    lokasi,
    stok: shortfall,
    master_barang_id: masterBarangId,
    satuan: "pcs",
    kategori: "ALKES",
  });
  if (insErr) return { ok: false, message: insErr.message };
  return { ok: true, toppedUp: shortfall };
}

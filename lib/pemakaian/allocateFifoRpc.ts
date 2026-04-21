import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeMasterBarangUuid } from "@/lib/pemakaian/masterBarangUuidForFifo";

/** Payload untuk `fifo_pemakaian_allocate_json` (satu argumen text berisi JSON string). */
export type AllocateFifoJsonPayload = {
  p_master_barang_id: string;
  p_jumlah: number;
  p_lokasi: string;
  /**
   * Dulu dikirim ke RPC; sekarang **diabaikan** (tidak dimasukkan ke JSON RPC).
   * ID kasus cukup di `cathlab_pemakaian_order.tindakan_id` / konteks order —
   * mengirim angka ke DB lama bisa memicu `invalid input syntax for type uuid`.
   */
  p_tindakan_id_text?: string | null;
  p_keterangan?: string | null;
  p_tanggal?: string | null;
  p_order_id?: string | null;
};

/**
 * RPC `fifo_pemakaian_allocate_json(p_payload text)`: kirim JSON.stringify agar PostgREST
 * tidak salah mengisi field jsonb; kunci `master_barang_uuid` + `qty_dipakai` eksplisit.
 */
export function rpcAllocatePemakaianFifo(
  supabase: SupabaseClient,
  payload: AllocateFifoJsonPayload,
) {
  const masterUuid = normalizeMasterBarangUuid(payload.p_master_barang_id);
  if (!masterUuid) {
    return Promise.resolve({
      data: null,
      error: {
        message: `master_barang_id bukan UUID valid: ${String(payload.p_master_barang_id)}`,
      },
    });
  }
  const qty = Number(payload.p_jumlah);
  if (!Number.isFinite(qty) || qty <= 0) {
    return Promise.resolve({
      data: null,
      error: {
        message: `p_jumlah tidak valid: ${String(payload.p_jumlah)}`,
      },
    });
  }

  // Jangan sertakan `p_tindakan_id_text` di payload RPC: fungsi DB lama bisa menulisnya ke
  // kolom uuid; tautan kasus tetap lewat cathlab_pemakaian_order + cathlab_pemakaian_order_id.
  const body: Record<string, unknown> = {
    master_barang_uuid: masterUuid,
    qty_dipakai: qty,
    p_lokasi: payload.p_lokasi,
    p_keterangan: payload.p_keterangan ?? null,
    p_tanggal: payload.p_tanggal ?? null,
    p_order_id: payload.p_order_id ?? null,
  };

  return supabase.rpc("fifo_pemakaian_allocate_json", {
    p_payload: JSON.stringify(body),
  });
}

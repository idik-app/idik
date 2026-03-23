import type { SupabaseClient } from "@supabase/supabase-js";

/** Selaras dengan penyisipan di API distributor / pemakaian. */
export type DistributorEventType =
  | "PRODUCT_UPSERT"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "KATALOG_RETUR"
  | "RETUR_DIBATALKAN"
  | "MUTASI_STOK"
  | "PEMAKAIAN_FIFO";

/**
 * Catat peristiwa distributor. Gagal insert tidak mengganggu transaksi utama (hanya log konsol).
 */
export async function insertDistributorEvent(
  supabase: SupabaseClient,
  params: {
    distributorId: string;
    eventType: DistributorEventType;
    payload: Record<string, unknown>;
    actor?: string | null;
    notaNomor?: string | null;
    penerimaPetugas?: string | null;
    /** Hanya untuk KATALOG_RETUR */
    returFisikStatus?: string | null;
    notaPengiriman?: string | null;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from("distributor_event_log").insert({
      distributor_id: params.distributorId,
      event_type: params.eventType,
      payload: params.payload,
      actor: params.actor ?? null,
      nota_nomor: params.notaNomor ?? null,
      penerima_petugas: params.penerimaPetugas ?? null,
      retur_fisik_status: params.returFisikStatus ?? null,
      nota_pengiriman: params.notaPengiriman ?? null,
    } as never);
    if (error) console.error("[distributor_event_log]", error.message);
  } catch (e) {
    console.error("[distributor_event_log]", e);
  }
}

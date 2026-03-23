import {
  parseDistributorEventPayload,
} from "@/lib/distributorReturSnapshot";
import {
  RETUR_FISIK_LABEL,
  RETUR_FISIK_STATUS,
  type ReturFisikStatus,
} from "@/lib/distributorReturFisik";

export type BarangRow = {
  id: string;
  master_barang_id: string;
  master_barang: { kode: string; nama: string } | null;
  inventaris_lines?: { id: string }[];
};

export type EventRow = {
  id: string;
  created_at: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  actor: string | null;
  nota_nomor?: string | null;
  penerima_petugas?: string | null;
  nota_pengiriman?: string | null;
  retur_fisik_status?: string | null;
};

export type SummaryData = {
  total_peristiwa: number;
  retur_katalog: number;
  batal_retur: number;
  retur_belum_dibatalkan_kira: number;
};

export const EVENT_LABEL: Record<string, string> = {
  PRODUCT_UPSERT: "Produk (katalog)",
  PRODUCT_UPDATED: "Produk diubah",
  PRODUCT_DELETED: "Mapping dihapus",
  KATALOG_RETUR: "Retur katalog",
  RETUR_DIBATALKAN: "Batal retur",
  MUTASI_STOK: "Kirim barang",
  PEMAKAIAN_FIFO: "Pemakaian FIFO",
};

export const EVENT_TYPES = [
  "",
  "KATALOG_RETUR",
  "RETUR_DIBATALKAN",
  "PRODUCT_UPSERT",
  "PRODUCT_UPDATED",
  "MUTASI_STOK",
  "PEMAKAIAN_FIFO",
];

export function payloadStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim()) return v;
  return null;
}

/** Nomor referensi tampilan jika nota tidak pernah tersimpan (retur lama). */
export function syntheticNotaRef(ev: EventRow): string {
  const d = new Date(ev.created_at);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const suf = ev.id.replace(/-/g, "").slice(0, 6);
  return `RT-${y}${m}${day}-${suf}`;
}

export function notaReturComputed(ev: EventRow): { text: string; title?: string } {
  const col = ev.nota_nomor?.trim();
  if (col) return { text: col };
  const p = parseDistributorEventPayload(ev.payload);
  const fromPayload =
    payloadStr(p.nota_nomor) ??
    payloadStr((p as { notaNomor?: unknown }).notaNomor);
  if (fromPayload) return { text: fromPayload };
  if (ev.event_type === "KATALOG_RETUR") {
    return {
      text: syntheticNotaRef(ev),
      title:
        "Nomor referensi otomatis dari jejak (nota tidak tersimpan di database atau retur sebelum pencatatan nota).",
    };
  }
  return { text: "—" };
}

export function petugasDisplay(ev: EventRow): string {
  const col = ev.penerima_petugas?.trim();
  if (col) return col;
  const p = parseDistributorEventPayload(ev.payload);
  const fromPayload =
    payloadStr(p.penerima_petugas) ??
    payloadStr((p as { penerimaPetugas?: unknown }).penerimaPetugas);
  return fromPayload?.trim() || "—";
}

/** Tampilan status; retur lama tanpa kolom diperlakukan seperti menunggu ambil. */
export function returFisikEffective(ev: EventRow): ReturFisikStatus {
  const raw = ev.retur_fisik_status?.trim();
  if (raw && (RETUR_FISIK_STATUS as readonly string[]).includes(raw)) {
    return raw as ReturFisikStatus;
  }
  const p = parseDistributorEventPayload(ev.payload);
  const fromP =
    payloadStr(p.retur_fisik_status) ??
    payloadStr((p as { returFisikStatus?: unknown }).returFisikStatus);
  if (
    fromP &&
    (RETUR_FISIK_STATUS as readonly string[]).includes(fromP.trim())
  ) {
    return fromP.trim() as ReturFisikStatus;
  }
  return "MENUNGGU_AMBIL";
}

export function notaPengirimanDisplay(ev: EventRow): string {
  const col = ev.nota_pengiriman?.trim();
  if (col) return col;
  const p = parseDistributorEventPayload(ev.payload);
  const fromP =
    payloadStr(p.nota_pengiriman) ??
    payloadStr((p as { notaPengiriman?: unknown }).notaPengiriman);
  return (fromP ?? "").trim();
}

export function detailLine(type: string, p: Record<string, unknown>): string {
  const tipe = payloadStr(p.tipe);
  const qty = p.qty_delta ?? p.jumlah;
  const ket = payloadStr(p.keterangan);
  const inv = payloadStr(p.inventaris_id);
  const keys = Array.isArray(p.updated_keys)
    ? (p.updated_keys as string[]).join(", ")
    : null;

  switch (type) {
    case "MUTASI_STOK":
      return [
        tipe && `Tipe: ${tipe}`,
        qty != null &&
          !Number.isNaN(Number(qty)) &&
          `Δ ${Number(qty) > 0 ? "+" : ""}${qty}`,
        ket,
        inv && `inv …${String(inv).slice(0, 8)}`,
      ]
        .filter(Boolean)
        .join(" · ");
    case "PEMAKAIAN_FIFO":
      return [
        p.jumlah != null && `Qty ${p.jumlah}`,
        payloadStr(p.lokasi) && `Lokasi ${payloadStr(p.lokasi)}`,
        ket,
      ]
        .filter(Boolean)
        .join(" · ");
    case "PRODUCT_UPDATED":
      return keys ? `Kolom: ${keys}` : "Perubahan katalog";
    case "PRODUCT_DELETED":
      return "Dihapus dari katalog distributor";
    case "KATALOG_RETUR": {
      const snap =
        payloadStr(p.master_kode) && payloadStr(p.master_nama)
          ? `${payloadStr(p.master_kode)} — ${payloadStr(p.master_nama)}`
          : null;
      const via =
        payloadStr(p.alasan) === "retur_distributor"
          ? "Retur dari portal distributor"
          : "Retur katalog";
      return snap ? `${via} · ${snap}` : via;
    }
    case "RETUR_DIBATALKAN":
      return [
        payloadStr(p.nota_asal) && `Nota asal: ${payloadStr(p.nota_asal)}`,
        payloadStr(p.restored_distributor_barang_id) && `Mapping dipulihkan`,
      ]
        .filter(Boolean)
        .join(" · ");
    case "PRODUCT_UPSERT":
      return payloadStr(p.kode_distributor)
        ? `Kode dist.: ${payloadStr(p.kode_distributor)}`
        : "Tambah / perbarui mapping";
    default:
      return "";
  }
}

export { RETUR_FISIK_LABEL };

/**
 * Side effects after "Cek obat" (NTG / Heparin):
 * prefill slot Pemakaian + optional FIFO allocate.
 * Hapus baris Log tidak me-reset cek_* (sengaja — uncheck tidak dari UI Log).
 */
import {
  buildPrefillSlot,
  CEK_OBAT_FIFO_NAME_HINTS,
  CEK_OBAT_LABEL,
  CEK_OBAT_TEMPLATE_BY_KIND,
  type CekObatKind,
  mergeObatAlkesPrefill,
  parseQtyFromKet,
} from "@/lib/tindakan/cekObatPemakaianBridge";
import { normalizeMasterBarangUuid } from "@/lib/pemakaian/masterBarangUuidForFifo";

async function fetchLatestPemakaianOrder(tindakanId: string): Promise<{
  id: string;
  template_input_barang?: unknown;
} | null> {
  const res = await fetch(
    `/api/pemakaian-orders?tindakanId=${encodeURIComponent(tindakanId)}&limit=20`,
    { credentials: "include" },
  );
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: Array<Record<string, unknown>>;
    rows?: Array<Record<string, unknown>>;
  };
  const rows = Array.isArray(json.data)
    ? json.data
    : Array.isArray(json.rows)
      ? json.rows
      : [];
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => {
    const ta = String(a.updated_at ?? a.created_at ?? "");
    const tb = String(b.updated_at ?? b.created_at ?? "");
    return tb.localeCompare(ta);
  });
  const top = sorted[0];
  return {
    id: String(top.id),
    template_input_barang: top.template_input_barang,
  };
}

async function forwardPrefillPemakaian(opts: {
  tindakanId: string;
  kind: CekObatKind;
  ket: string;
  jam: string;
}): Promise<{ orderId: string | null }> {
  const order = await fetchLatestPemakaianOrder(opts.tindakanId);
  if (!order) return { orderId: null };
  const rowId = CEK_OBAT_TEMPLATE_BY_KIND[opts.kind];
  const nextPrefill = buildPrefillSlot({ ket: opts.ket, jam: opts.jam });
  const merged = mergeObatAlkesPrefill(
    order.template_input_barang,
    rowId,
    nextPrefill,
  );
  if (!merged.changed) return { orderId: order.id };
  const res = await fetch(
    `/api/pemakaian-orders/${encodeURIComponent(order.id)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_input_barang: merged.template }),
    },
  );
  if (!res.ok && process.env.NODE_ENV === "development") {
    console.warn("[CekObat] prefill pemakaian gagal", await res.text());
  }
  return { orderId: order.id };
}

async function tryFifoAllocate(opts: {
  tindakanId: string;
  kind: CekObatKind;
  ket: string;
  orderId: string | null;
}) {
  const hints = CEK_OBAT_FIFO_NAME_HINTS[opts.kind];
  const masterRes = await fetch("/api/master-barang", {
    credentials: "include",
  }).catch(() => null);
  let masterUuid: string | null = null;
  let masterNama = CEK_OBAT_LABEL[opts.kind];
  if (masterRes?.ok) {
    const mj = (await masterRes.json().catch(() => ({}))) as {
      data?: Array<{ id?: unknown; nama?: string | null }>;
      rows?: Array<{ id?: unknown; nama?: string | null }>;
      items?: Array<{ id?: unknown; nama?: string | null }>;
    };
    const rows = Array.isArray(mj.data)
      ? mj.data
      : Array.isArray(mj.rows)
        ? mj.rows
        : Array.isArray(mj.items)
          ? mj.items
          : [];
    for (const row of rows) {
      const nama = String(row.nama ?? "").toLowerCase();
      if (!hints.some((h) => nama.includes(h))) continue;
      const uuid = normalizeMasterBarangUuid(row.id);
      if (uuid) {
        masterUuid = uuid;
        masterNama = String(row.nama ?? masterNama);
        break;
      }
    }
  }
  if (!masterUuid) {
    throw new Error(
      `Master barang untuk ${CEK_OBAT_LABEL[opts.kind]} tidak ditemukan (UUID).`,
    );
  }
  const jumlah = parseQtyFromKet(opts.ket);
  const res = await fetch("/api/pemakaian/allocate", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      master_barang_id: masterUuid,
      jumlah,
      lokasi: "Cathlab",
      keterangan: `Cek obat tab Tindakan: ${masterNama}${opts.orderId ? ` (order ${opts.orderId})` : ""}`,
      tindakan_id: opts.tindakanId,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
  };
  if (!res.ok || json.ok === false) {
    throw new Error(json.message || `Alokasi FIFO gagal (${res.status})`);
  }
}

/**
 * Prefill Pemakaian; optionally confirm + run FIFO (hanya untuk baris log baru).
 */
export async function runCekObatSideEffects(opts: {
  tindakanId: string;
  kind: CekObatKind;
  ket: string;
  jam: string;
  /** false = skip dialog FIFO (re-select / sudah ada di log) */
  offerFifo: boolean;
}): Promise<void> {
  try {
    const { orderId } = await forwardPrefillPemakaian({
      tindakanId: opts.tindakanId,
      kind: opts.kind,
      ket: opts.ket,
      jam: opts.jam,
    });
    if (!opts.offerFifo) return;
    const label = CEK_OBAT_LABEL[opts.kind];
    const okFifo = window.confirm(
      `Alokasi stok FIFO untuk ${label}? (Batal = hanya dokumentasi/checklist)`,
    );
    if (!okFifo) return;
    try {
      await tryFifoAllocate({
        tindakanId: opts.tindakanId,
        kind: opts.kind,
        ket: opts.ket,
        orderId,
      });
    } catch (e) {
      window.alert(
        e instanceof Error
          ? e.message
          : "Alokasi FIFO gagal. Data cek obat tetap tersimpan.",
      );
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CekObat] side effects", e);
    }
  }
}

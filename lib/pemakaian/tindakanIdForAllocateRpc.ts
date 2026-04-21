/**
 * Parse ID tindakan numerik (selaras dengan `public.tindakan.id` bigint).
 */
export function tindakanIdForAllocateRpc(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = Math.trunc(raw);
    return Number.isSafeInteger(n) && n >= 0 ? n : null;
  }
  const t = typeof raw === "string" ? raw.trim() : String(raw).trim();
  if (!t) return null;
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
}

/** Nilai untuk kolom text `cathlab_pemakaian_order.tindakan_id`. */
export function tindakanIdTextForOrder(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = Math.trunc(raw);
    return n >= 0 ? String(n) : null;
  }
  const s = String(raw).trim();
  return s || null;
}

/**
 * Untuk RPC `allocate_pemakaian_fifo`: kirim param **`p_tindakan_id_text`** (bukan bigint),
 * supaya PostgREST tidak pernah mengikat string `"4"` ke overload param **uuid**.
 */
export function tindakanIdTextParamForAllocateFifo(raw: unknown): string | null {
  const n = tindakanIdForAllocateRpc(raw);
  return n === null ? null : String(n);
}

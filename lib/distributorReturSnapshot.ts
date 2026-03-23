/**
 * Normalisasi kolom `payload` dari `distributor_event_log` (jsonb bisa
 * ter-serialize sebagai string di beberapa jalur).
 */
export function parseDistributorEventPayload(
  payload: unknown,
): Record<string, unknown> {
  if (payload == null) return {};
  if (typeof payload === "string") {
    const t = payload.trim();
    if (!t) return {};
    try {
      let o = JSON.parse(t) as unknown;
      if (typeof o === "string") {
        try {
          o = JSON.parse(o) as unknown;
        } catch {
          /* satu level saja */
        }
      }
      if (o != null && typeof o === "object" && !Array.isArray(o)) {
        return o as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

/**
 * Snapshot baris distributor_barang pada event KATALOG_RETUR (objek JSON
 * atau string JSON jika tersimpan tidak konsisten).
 */
export function getReturSnapshotFromPayload(payload: unknown): Record<string, unknown> | null {
  const p = parseDistributorEventPayload(payload);
  const raw = p.snapshot;
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const o = JSON.parse(raw) as unknown;
      if (o != null && typeof o === "object" && !Array.isArray(o)) {
        return o as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * True jika event KATALOG_RETUR bisa dipulihkan ke `distributor_barang`
 * (snapshot penuh dari retur portal, atau minimal `master_barang_id` di jejak).
 */
export function canRestoreKatalogRetur(payload: unknown): boolean {
  if (getReturSnapshotFromPayload(payload) != null) return true;
  const p = parseDistributorEventPayload(payload);
  const raw = p.master_barang_id;
  const id =
    typeof raw === "string"
      ? raw.trim()
      : typeof raw === "number" && Number.isFinite(raw)
        ? String(raw)
        : "";
  return id.length > 0;
}

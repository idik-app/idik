/** Bentuk payload tersimpan di intensive_flow_sheet.payload */
export type IntensiveFlowSheetPayload = {
  data: Record<string, Record<string, string | number>>;
  /** reserved untuk migrasi format */
  version?: number;
};

export function sanitizeFlowSheetPayload(raw: unknown): IntensiveFlowSheetPayload {
  if (!raw || typeof raw !== "object") return { data: {} };
  const o = raw as Record<string, unknown>;
  const data = o.data;
  if (!data || typeof data !== "object") return { data: {} };
  const out: Record<string, Record<string, string | number>> = {};
  for (const [paramId, cellMap] of Object.entries(data as Record<string, unknown>)) {
    if (!cellMap || typeof cellMap !== "object") continue;
    out[paramId] = {};
    for (const [k, v] of Object.entries(cellMap as Record<string, unknown>)) {
      if (v == null) continue;
      if (typeof v === "string" || typeof v === "number") out[paramId][k] = v;
    }
  }
  return { data: out, version: 1 };
}

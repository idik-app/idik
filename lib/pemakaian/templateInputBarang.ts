/** Bentuk tersimpan di kolom `template_input_barang` (JSON). */
export type TemplateInputBarangPayload = {
  obatAlkes: Record<string, string>;
  komponen: Record<string, string>;
};

function toStringMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return Object.fromEntries(
    Object.entries(v as Record<string, unknown>).map(([k, val]) => [
      k,
      String(val ?? ""),
    ]),
  );
}

/** Normalisasi body API / baris DB ke struktur aman. */
export function normalizeTemplateInputBarang(
  raw: unknown,
): TemplateInputBarangPayload {
  if (raw === undefined || raw === null) {
    return { obatAlkes: {}, komponen: {} };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { obatAlkes: {}, komponen: {} };
  }
  const o = raw as Record<string, unknown>;
  return {
    obatAlkes: toStringMap(o.obatAlkes),
    komponen: toStringMap(o.komponen),
  };
}

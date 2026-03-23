/** Template gambar koroner (model 3D referensi di klien). */
export const KORONAR_TEMPLATES = [
  {
    id: "standard-v1",
    label: "Pohon koroner standar (LMCA, LAD, Circ, RCA, …)",
  },
] as const;

export type KoronarTemplateId = (typeof KORONAR_TEMPLATES)[number]["id"];

export function isKnownTemplate(id: string): id is KoronarTemplateId {
  return KORONAR_TEMPLATES.some((t) => t.id === id);
}

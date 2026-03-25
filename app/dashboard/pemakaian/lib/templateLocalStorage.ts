import {
  TEMPLATE_KOMPONEN,
  TEMPLATE_OBAT_ALKES,
  type TemplateChecklistRow,
} from "@/app/dashboard/pemakaian/data/templateInputBarangRows";

const KEY_OBAT = "idik.pemakaian.template.v1.obatAlkes";
const KEY_KOMP = "idik.pemakaian.template.v1.komponen";

function parseRows(raw: unknown): TemplateChecklistRow[] | null {
  if (!Array.isArray(raw)) return null;
  /** Daftar sengaja dikosongkan — beda dari data rusak / tidak ada. */
  if (raw.length === 0) return [];
  const out: TemplateChecklistRow[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : "";
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const slots = Number(o.slots);
    if (!id || !label || !Number.isFinite(slots)) continue;
    const n = Math.min(12, Math.max(1, Math.floor(slots)));
    const catatanRaw = o.catatan;
    const catatan =
      typeof catatanRaw === "string" && catatanRaw.trim()
        ? catatanRaw.trim()
        : undefined;
    out.push({ id, label, slots: n, catatan });
  }
  return out.length > 0 ? out : null;
}

export function loadObatAlkesRows(): TemplateChecklistRow[] {
  if (typeof window === "undefined") return [...TEMPLATE_OBAT_ALKES];
  try {
    const s = localStorage.getItem(KEY_OBAT);
    if (!s) return [...TEMPLATE_OBAT_ALKES];
    const parsed = parseRows(JSON.parse(s) as unknown);
    if (parsed === null) return [...TEMPLATE_OBAT_ALKES];
    return parsed;
  } catch {
    return [...TEMPLATE_OBAT_ALKES];
  }
}

export function saveObatAlkesRows(rows: TemplateChecklistRow[]): void {
  localStorage.setItem(KEY_OBAT, JSON.stringify(rows));
}

export function resetObatAlkesStorageToDefault(): void {
  localStorage.removeItem(KEY_OBAT);
}

export function loadKomponenRows(): TemplateChecklistRow[] {
  if (typeof window === "undefined") return [...TEMPLATE_KOMPONEN];
  try {
    const s = localStorage.getItem(KEY_KOMP);
    if (!s) return [...TEMPLATE_KOMPONEN];
    const parsed = parseRows(JSON.parse(s) as unknown);
    if (parsed === null) return [...TEMPLATE_KOMPONEN];
    return parsed;
  } catch {
    return [...TEMPLATE_KOMPONEN];
  }
}

export function saveKomponenRows(rows: TemplateChecklistRow[]): void {
  localStorage.setItem(KEY_KOMP, JSON.stringify(rows));
}

export function resetKomponenStorageToDefault(): void {
  localStorage.removeItem(KEY_KOMP);
}

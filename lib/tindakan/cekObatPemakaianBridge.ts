/**
 * Jembatan cek obat tab Tindakan ↔ checklist Pemakaian + helper format.
 */

import { normalizeTemplateInputBarang } from "@/lib/pemakaian/templateInputBarang";

export const CEK_OBAT_TEMPLATE_HEPARIN_ID = "oa-12";
/** NTG / Cedocard di TEMPLATE_OBAT_ALKES */
export const CEK_OBAT_TEMPLATE_NTG_ID = "oa-12b";

export type CekObatKind = "heparin" | "ntg_cedocard";

export const CEK_OBAT_TEMPLATE_BY_KIND: Record<CekObatKind, string> = {
  heparin: CEK_OBAT_TEMPLATE_HEPARIN_ID,
  ntg_cedocard: CEK_OBAT_TEMPLATE_NTG_ID,
};

export const CEK_OBAT_LABEL: Record<CekObatKind, string> = {
  heparin: "Heparin",
  ntg_cedocard: "NTG / Cedocard",
};

/** Master barang name hints for FIFO match (lowercase contains). */
export const CEK_OBAT_FIFO_NAME_HINTS: Record<CekObatKind, string[]> = {
  heparin: ["heparin", "inviclot"],
  ntg_cedocard: ["ntg", "cedocard", "nitroglycerin", "nitroglycerine"],
};

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function normalizeCekJam(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const t = String(raw).trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi) || h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

export function isValidCekJam(raw: unknown): boolean {
  const n = normalizeCekJam(raw);
  return n != null && HHMM_RE.test(n);
}

export function nowCekJamLocal(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function buildPrefillSlot(opts: {
  ket?: string | null;
  jam?: string | null;
}): string {
  const ket = String(opts.ket ?? "").trim();
  const jam = normalizeCekJam(opts.jam);
  if (ket && jam) return `${ket} @ ${jam}`;
  if (jam) return `1 @ ${jam}`;
  if (ket) return ket;
  return "1";
}

export function parsePrefillSlot(raw: string): { ket: string | null; jam: string | null } {
  const t = String(raw ?? "").trim();
  if (!t) return { ket: null, jam: null };
  const at = t.match(/^(.*?)\s*@\s*(\d{1,2}:\d{1,2})\s*$/);
  if (at) {
    const jam = normalizeCekJam(at[2]);
    let ket = at[1].trim();
    if (ket === "1") ket = "";
    return { ket: ket || null, jam };
  }
  const jamOnly = normalizeCekJam(t);
  if (jamOnly && t === jamOnly) return { ket: null, jam: jamOnly };
  return { ket: t, jam: null };
}

export type LogBarangKlinisItem = {
  id: string;
  nama: string;
  jam: string | null;
  keterangan: string | null;
  oleh: string | null;
};

export function sanitizeLogBarangKlinis(raw: unknown): LogBarangKlinisItem[] {
  if (!Array.isArray(raw)) return [];
  const out: LogBarangKlinisItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id =
      typeof o.id === "string" && o.id.trim()
        ? o.id.trim()
        : `lb-${Math.random().toString(36).slice(2, 10)}`;
    const nama = typeof o.nama === "string" ? o.nama.trim() : "";
    const keterangan =
      typeof o.keterangan === "string" && o.keterangan.trim()
        ? o.keterangan.trim()
        : null;
    const oleh =
      typeof o.oleh === "string" && o.oleh.trim() ? o.oleh.trim() : null;
    const jam = normalizeCekJam(o.jam);
    if (!nama && !keterangan && !oleh && !jam) continue;
    out.push({ id, nama, jam, keterangan, oleh });
  }
  return out;
}

export function toBoolCek(v: unknown): boolean {
  return v === true || v === 1 || String(v) === "true" || String(v) === "1";
}

/**
 * Merge prefill ke obatAlkes hanya jika slot kosong atau masih sama dengan prefill lama.
 */
export function mergeObatAlkesPrefill(
  templateRaw: unknown,
  rowId: string,
  nextPrefill: string,
  previousAutoPrefill?: string | null,
): { changed: boolean; template: ReturnType<typeof normalizeTemplateInputBarang> } {
  const template = normalizeTemplateInputBarang(templateRaw);
  const cur = String(template.obatAlkes[rowId] ?? "").trim();
  const prev = String(previousAutoPrefill ?? "").trim();
  if (cur && cur !== prev) {
    return { changed: false, template };
  }
  if (cur === nextPrefill) {
    return { changed: false, template };
  }
  return {
    changed: true,
    template: {
      ...template,
      obatAlkes: { ...template.obatAlkes, [rowId]: nextPrefill },
    },
  };
}

export type CekObatPatchKeys = {
  checkedKey: string;
  ketKey: string;
  jamKey: string;
  olehKey: string;
};

export function cekObatKeys(kind: CekObatKind): CekObatPatchKeys {
  if (kind === "heparin") {
    return {
      checkedKey: "cek_heparin",
      ketKey: "cek_heparin_ket",
      jamKey: "cek_heparin_jam",
      olehKey: "cek_heparin_oleh",
    };
  }
  return {
    checkedKey: "cek_ntg_cedocard",
    ketKey: "cek_ntg_cedocard_ket",
    jamKey: "cek_ntg_cedocard_jam",
    olehKey: "cek_ntg_cedocard_oleh",
  };
}

/**
 * Dari checklist Pemakaian → patch tindakan (hanya field kosong / unchecked).
 */
export function applyPemakaianChecklistToCek(opts: {
  kind: CekObatKind;
  slotValue: string;
  current: Record<string, unknown>;
}): Record<string, unknown> | null {
  const slot = String(opts.slotValue ?? "").trim();
  if (!slot) return null;
  const keys = cekObatKeys(opts.kind);
  const { ket, jam } = parsePrefillSlot(slot);
  const patch: Record<string, unknown> = {};
  if (!toBoolCek(opts.current[keys.checkedKey])) {
    patch[keys.checkedKey] = true;
  }
  const curKet = String(opts.current[keys.ketKey] ?? "").trim();
  const curJam = normalizeCekJam(opts.current[keys.jamKey]);
  if (!curKet && ket) patch[keys.ketKey] = ket;
  if (!curJam && jam) patch[keys.jamKey] = jam;
  if (!curKet && !ket && !jam) {
    // slot tanpa format @ → seluruh string jadi ket jika ket kosong
    if (!curKet) patch[keys.ketKey] = slot;
  }
  return Object.keys(patch).length ? patch : null;
}

export function formatCekObatReportCell(opts: {
  checked: boolean;
  ket?: string | null;
  jam?: string | null;
  oleh?: string | null;
}): string {
  if (!opts.checked) return "—";
  const ket = String(opts.ket ?? "").trim();
  const jam = normalizeCekJam(opts.jam);
  const oleh = String(opts.oleh ?? "").trim();
  let s = "Ya";
  if (ket) s += ` — ${ket}`;
  if (jam) s += ` @ ${jam}`;
  if (oleh) s += ` (${oleh})`;
  return s;
}

export function formatLogBarangReportCell(raw: unknown): string {
  const items = sanitizeLogBarangKlinis(raw);
  if (!items.length) return "—";
  return items
    .map((it) => {
      const parts: string[] = [];
      const nama = it.nama || "Item";
      parts.push(nama);
      if (it.keterangan) parts.push(`— ${it.keterangan}`);
      if (it.jam) parts.push(`@ ${it.jam}`);
      if (it.oleh) parts.push(`(${it.oleh})`);
      return parts.join(" ");
    })
    .join("; ");
}

export function parseQtyFromKet(ket: string | null | undefined): number {
  const t = String(ket ?? "").trim();
  if (!t) return 1;
  const m = t.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return 1;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

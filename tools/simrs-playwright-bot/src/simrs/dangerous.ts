import { config } from "../config.js";

const DEFAULT_DANGEROUS = [
  "hapus",
  "delete",
  "reset",
  "closing",
  "posting",
  "void",
  "purge",
  "truncate",
  "drop",
  "batal semua",
  "kosongkan",
];

export function isDangerousLabel(label: string): boolean {
  const s = label.toLowerCase().trim();
  if (!s) return false;
  const list = [...DEFAULT_DANGEROUS, ...config.exploreDangerousExtra];
  return list.some((k) => s.includes(k));
}

export function isSeparatorLabel(label: string): boolean {
  const s = label.trim();
  return !s || /^[\-\u2013\u2014_=]+$/.test(s);
}

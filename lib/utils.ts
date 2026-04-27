import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fungsi utilitas untuk menggabungkan class Tailwind CSS secara kondisional
 * dan menyelesaikan konflik secara otomatis (menggunakan twMerge).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats ISO date or date string for id-ID locale. */
export function formatTanggal(
  value: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (value == null || String(value).trim() === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...opts,
  });
}

export function truncateText(s: string | null | undefined, max: number): string {
  if (s == null) return "";
  const t = String(s);
  if (t.length <= max) return t;
  return t.slice(0, max) + "…";
}

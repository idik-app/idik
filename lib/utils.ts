import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fungsi utilitas untuk menggabungkan class Tailwind CSS secara kondisional
 * dan menyelesaikan konflik secara otomatis (menggunakan twMerge).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

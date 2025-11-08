"use client";
import { useEffect, useRef } from "react";

/**
 * Hook universal untuk menyimpan & memulihkan posisi scroll
 * di setiap tab atau halaman JARVIS Mode.
 * Gunakan: const ref = useScrollMemory("pasien");
 */
export function useScrollMemory(key: string) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // ambil posisi terakhir
    const saved = sessionStorage.getItem(`scroll-${key}`);
    if (saved) el.scrollTop = parseInt(saved, 10);

    // simpan posisi saat scroll
    const handleScroll = () =>
      sessionStorage.setItem(`scroll-${key}`, String(el.scrollTop));

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [key]);

  return ref;
}

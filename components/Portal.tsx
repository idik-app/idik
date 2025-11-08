"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, ReactNode } from "react";

/**
 * Portal Global JARVIS Cathlab Mode
 * ---------------------------------
 * Memastikan semua komponen overlay (modal, dialog, toast, shimmer)
 * ditampilkan di atas seluruh elemen layout dashboard.
 *
 * Gunakan dengan cara:
 * <Portal>
 *   <div className="fixed inset-0 z-[9999]">...</div>
 * </Portal>
 */

export default function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // render hanya setelah komponen terpasang (hindari SSR conflict)
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(children, document.body);
}

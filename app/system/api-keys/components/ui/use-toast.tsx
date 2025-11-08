"use client";

import { useCallback } from "react";

type ToastOptions = {
  title?: string;
  description?: string;
  type?: "info" | "success" | "error";
};

/**
 * Hook ringan untuk menampilkan notifikasi hologram.
 * Pemakaian:
 * const { toast } = useToast();
 * toast({ title: "Sukses", description: "Data tersimpan" });
 */
export function useToast() {
  const toast = useCallback(
    ({ title, description, type = "info" }: ToastOptions) => {
      const colors =
        type === "success"
          ? "bg-green-500/20 border-green-400 text-green-300"
          : type === "error"
          ? "bg-red-500/20 border-red-400 text-red-300"
          : "bg-cyan-500/20 border-cyan-400 text-cyan-300";

      const el = document.createElement("div");
      el.className = `fixed top-5 right-5 z-[1000] rounded-xl border px-4 py-3 shadow-md backdrop-blur-md transition-all ${colors}`;
      el.innerHTML = `
      <strong class="block">${title ?? "Notifikasi"}</strong>
      <span class="block text-sm opacity-80">${description ?? ""}</span>
    `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    },
    []
  );

  return { toast };
}

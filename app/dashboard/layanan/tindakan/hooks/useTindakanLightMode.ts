"use client";

import { useTheme } from "@/contexts/ThemeContext";

/** True saat mode siang (topbar) — untuk menyelaraskan layar Tindakan Cathlab. */
export function useTindakanLightMode() {
  const { theme } = useTheme();
  return theme === "light";
}

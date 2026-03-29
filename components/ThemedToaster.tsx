"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster position="bottom-right" theme={theme === "dark" ? "dark" : "light"} />
  );
}

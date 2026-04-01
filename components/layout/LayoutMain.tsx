"use client";

import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useTabs } from "@/app/contexts/TabContext";
import { useUI } from "@/contexts/UIContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

/*───────────────────────────────────────────────
 ⚙️ LayoutMain — Cathlab JARVIS Mode v6.8 Stable
   🔹 Render konten aktif dari TabContext
   🔹 Pembungkus stabil (tanpa key={activeTab}) agar TabContent tidak unmount
      → cache keep-alive di TabContent tetap hidup antar tab.
   🔹 BottomNav hanya di mobile
───────────────────────────────────────────────*/

// Dynamic imports agar tidak error saat server render
const TabContent = dynamic(() => import("@/components/TabContent"), {
  ssr: false,
});
const BottomNav = dynamic(() => import("@/components/BottomNav"), {
  ssr: false,
});

export default function LayoutMain() {
  const { activeTab } = useTabs();
  const { uiZoomPercent } = useUI();
  const { theme } = useTheme();
  const lightMode = theme === "light";
  /** Tab tindakan: tanpa kartu ganda (blur/border/shadow) supaya tabel memakai penuh area. */
  const flushContent = activeTab === "tindakan";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden antialiased [text-rendering:optimizeLegibility]"
      style={
        {
          zoom: uiZoomPercent / 100,
        } as CSSProperties
      }
    >
      {/* Konten utama */}
      <main
        className={cn(
          "relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain",
          flushContent
            ? "p-0 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:p-0 md:pb-6"
            : "p-3 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:p-6 md:pb-6",
        )}
      >
        <motion.div
          initial={{ opacity: 0, scale: flushContent ? 1 : 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={cn(
            "flex flex-col transition-colors duration-500",
            /* Tab tindakan: rantai flex + overflow untuk tabel; lainnya: biarkan konten memanjang, scroll di <main>. */
            flushContent
              ? "h-full min-h-0 overflow-x-hidden overflow-hidden"
              : "min-h-full min-w-0 overflow-x-hidden",
            flushContent
              ? "rounded-none border-0 bg-transparent p-0 shadow-none"
              : cn(
                  "rounded-2xl border p-1 md:p-2",
                  lightMode
                    ? "border-cyan-600/20 bg-gradient-to-br from-white via-slate-50 to-cyan-50/60 shadow-[0_4px_18px_rgba(14,116,144,0.08)]"
                    : "border-cyan-500/15 bg-gradient-to-br from-[#07111b]/90 via-[#060c14]/94 to-[#040913]/96 shadow-[0_0_14px_rgba(0,255,255,0.08)]",
                ),
          )}
        >
          <div
            className={cn(
              "relative min-h-0",
              flushContent ? "flex flex-1 flex-col" : "min-h-full",
            )}
          >
            <TabContent />
          </div>
        </motion.div>
      </main>

      {/* Navigasi bawah: fixed + z di BottomNav (hindari wrapper ganda). */}
      <BottomNav />
    </div>
  );
}

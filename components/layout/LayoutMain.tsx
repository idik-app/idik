"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useTabs } from "@/app/contexts/TabContext";
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
  const { theme } = useTheme();
  const { activeTab } = useTabs();
  const isLight = theme === "light";
  /** Tab tindakan: tanpa kartu ganda (blur/border/shadow) supaya tabel memakai penuh area. */
  const flushContent = activeTab === "tindakan";

  return (
    <>
      {/* Konten utama */}
      <main
        className={cn(
          "relative z-10 flex-1 overflow-y-auto overflow-x-hidden h-full",
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
            "h-full min-h-0 flex flex-col overflow-hidden transition-colors duration-500",
            flushContent
              ? "rounded-none border-0 bg-transparent p-0 shadow-none"
              : cn(
                  "rounded-2xl border p-1 md:p-2",
                  isLight
                    ? "border-cyan-600/20 bg-gradient-to-br from-white/95 via-slate-50/90 to-cyan-50/50 shadow-[0_4px_24px_rgba(0,100,120,0.06)]"
                    : "border-cyan-500/12 bg-gradient-to-br from-cyan-900/20 via-black/60 to-black/80 shadow-[0_0_14px_rgba(0,255,255,0.08)]",
                ),
          )}
        >
          <div className="relative flex-1 min-h-0">
            <TabContent />
          </div>
        </motion.div>
      </main>

      {/* Navigasi bawah (mobile only) */}
      <div className="fixed bottom-0 left-0 right-0 z-20 md:hidden">
        <BottomNav />
      </div>
    </>
  );
}

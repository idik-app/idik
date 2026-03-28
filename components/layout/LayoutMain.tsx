"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";

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
  return (
    <>
      {/* Konten utama */}
      <main
        className="
          relative z-10 flex-1 overflow-y-auto overflow-x-hidden
          h-full p-3 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:p-6 md:pb-6
        "
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="
            h-full min-h-0 flex flex-col rounded-2xl
            bg-gradient-to-br from-cyan-900/20 via-black/60 to-black/80
            border border-cyan-500/15
            shadow-[0_0_18px_rgba(0,255,255,0.15)]
            backdrop-blur-xl
            p-1 md:p-2 overflow-hidden
          "
        >
          <div className="flex-1 min-h-0 relative">
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

"use client";

import { motion } from "framer-motion";
import TabContent from "@/components/TabContent";
import BottomNav from "@/components/BottomNav";
import { useTabs } from "@app/contexts/TabContext";

/*───────────────────────────────────────────────
 ⚙️ LayoutMain – Cathlab JARVIS Mode v5.6.5 Stable
   🔹 Menampilkan konten aktif berdasarkan TabContext
   🔹 Efek transisi hologram cyan-gold
   🔹 BottomNav aktif hanya di mobile
───────────────────────────────────────────────*/
export default function LayoutMain() {
  const { activeTab } = useTabs();

  return (
    <>
      {/* Konten utama */}
      <main
        className="
          relative z-10 flex-1 overflow-y-auto
          h-full p-3 md:p-6
        "
      >
        <motion.div
          key={activeTab}
          initial={{ opacity: 0.6, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="
            min-h-full rounded-2xl
            bg-gradient-to-br from-cyan-900/20 via-black/60 to-black/80
            border border-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.15)]
            p-1 md:p-2
          "
        >
          {/* Render konten sesuai tab aktif */}
          <TabContent />
        </motion.div>
      </main>

      {/* Navigasi bawah (hanya tampil di mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-20 md:hidden">
        <BottomNav />
      </div>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import { useTabContext } from "@/contexts/TabContext";
import { useRouter } from "next/navigation";
import { menuConfig } from "@/app/config/menuConfig";

/* ⚡ Cathlab JARVIS TabBar v2.6 – Gold-Cyan Hybrid (Z-Index Fixed)
   🔹 Auto-highlight tab aktif berdasarkan URL (usePathname)
   🔹 Glow emas–cyan + Active-Line Motion
   🔹 Safe hydration + responsive scroll glow
   🔹 z-[60] agar tidak menutupi modal
   🔹 Author: Habibur Rahman
*/

export default function TabBar() {
  const { tabs, activeTab, setActiveTab, closeTab, addTab, closeAllTabs } = useTabContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [glowLeft, setGlowLeft] = useState(false);
  const [glowRight, setGlowRight] = useState(false);
  const [mounted, setMounted] = useState(false);

  const hrefByTabId = (() => {
    const map = new Map<string, string>();
    try {
      for (const group of menuConfig as Array<{ items?: Array<{ id: string; href?: string }> }>) {
        for (const item of group.items ?? []) {
          if (item?.id && item?.href) map.set(item.id, item.href);
        }
      }
    } catch {
      // ignore
    }
    // fallback penting
    if (!map.has("dashboard")) map.set("dashboard", "/dashboard");
    // Tindakan medis tidak ada di sidebar (hub Perawat); tab dari URL perlu href
    if (!map.has("tindakan")) map.set("tindakan", "/dashboard/layanan/tindakan");
    return map;
  })();

  const pushForTab = (tabId: string) => {
    const href = hrefByTabId.get(tabId);
    if (href) router.push(href);
  };

  /* 🧭 Prevent SSR mismatch */
  useEffect(() => setMounted(true), []);

  /* 🧩 Pastikan tab Dashboard selalu ada */
  useEffect(() => {
    if (mounted && !tabs.some((t) => t.id === "dashboard")) {
      // Jangan override activeTab (URL sync bisa sedang mengarah ke /system/*)
      addTab({ id: "dashboard", label: "Dashboard Utama", fixed: true }, { activate: false });
    }
  }, [mounted, tabs, addTab]);

  /* 🌈 Scroll Glow Detection */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleGlow = () => {
      const scrollLeft = el.scrollLeft;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const hasOverflow = el.scrollWidth > el.clientWidth;
      setGlowLeft(hasOverflow && scrollLeft > 8);
      setGlowRight(hasOverflow && scrollLeft < maxScroll - 8);
    };
    handleGlow();
    el.addEventListener("scroll", handleGlow);
    window.addEventListener("resize", handleGlow);
    return () => {
      el.removeEventListener("scroll", handleGlow);
      window.removeEventListener("resize", handleGlow);
    };
  }, [tabs]);

  // Sinkron URL ↔ tab ditangani di TabContext (biar konsisten dengan mapping menuConfig)

  return (
    <div
      className="relative z-[30] select-none" // ← FIX: layer di bawah modal
      suppressHydrationWarning
    >
      {/* 🔷 Main Tab Container — min-h agar tidak collapse saat banyak tab ditutup */}
      <div
        className="relative flex items-center min-h-[48px] bg-[#04070d]/70 backdrop-blur-xl
                   border-b border-cyan-500/20
                   shadow-[0_0_15px_rgba(0,255,255,0.25)]"
      >
        <div
          ref={containerRef}
          className="flex-1 min-w-0 flex items-center gap-2 px-4 py-2 overflow-x-auto hide-scrollbar"
        >
          <AnimatePresence initial={false}>
            {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.div
                key={tab.id}
                layout
                initial={{ scale: 0.85, opacity: 0, y: 5 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{
                  position: "absolute",
                  scale: 0.8,
                  opacity: 0,
                  y: -5,
                  transition: { duration: 0.2 },
                }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
              >
                <button
                  onClick={() => {
                    // TabBar harus mengubah URL juga agar sinkron dengan tab aktif
                    const href = hrefByTabId.get(tab.id);
                    if (href) {
                      // URL = source of truth; TabContext akan sinkron via usePathname
                      router.push(href);
                    } else {
                      // fallback kalau tab tidak punya route
                      setActiveTab(tab.id);
                    }
                  }}
                  className={`group relative flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300
                    ${
                      isActive
                        ? "border-[#D4AF37]/70 bg-gradient-to-r from-[#0e141d]/90 to-[#16222e]/90 text-cyan-200 shadow-[0_0_12px_rgba(212,175,55,0.3),0_0_16px_rgba(0,255,255,0.25)]"
                        : "border-transparent text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/5"
                    }`}
                >
                  <span className="font-medium whitespace-nowrap">
                    {tab.label}
                  </span>

                  {/* ❌ Close Button (Non-fixed tabs only) */}
                  {!tab.fixed && (
                    <X
                      size={14}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="opacity-50 hover:opacity-100 hover:text-rose-400 transition"
                    />
                  )}

                  {/* ✨ Active Underline Glow */}
                  {isActive && (
                    <motion.div
                      layoutId="active-line"
                      className="absolute bottom-0 left-[15%] right-[15%] h-[2px]
                                 bg-gradient-to-r from-[#D4AF37]/80 via-cyan-300/90 to-[#D4AF37]/80
                                 shadow-[0_0_10px_#00ffff,0_0_15px_#D4AF37]"
                      transition={{ duration: 0.25 }}
                    />
                  )}
                </button>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>

        {/* 🧹 Tutup semua tab (sisakan Dashboard) */}
        <div className="flex-shrink-0 pr-2">
          <motion.button
            type="button"
            onClick={() => closeAllTabs()}
            disabled={tabs.length <= 1}
            className="p-2 rounded-lg text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition disabled:opacity-50 disabled:pointer-events-none"
            title="Tutup semua tab"
            aria-label="Tutup semua tab"
          >
            <Trash2 size={18} />
          </motion.button>
        </div>
      </div>

      {/* 🔹 Neon Glow Edges */}
      <AnimatePresence>
        {glowLeft && (
          <motion.div
            key="glow-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute top-0 left-0 h-full w-10
                       pointer-events-none
                       bg-gradient-to-r from-cyan-400/40 to-transparent blur-sm"
          />
        )}
        {glowRight && (
          <motion.div
            key="glow-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute top-0 right-0 h-full w-10
                       pointer-events-none
                       bg-gradient-to-l from-cyan-400/40 to-transparent blur-sm"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

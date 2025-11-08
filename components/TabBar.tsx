"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTabContext } from "@/app/contexts/TabContext";
import { usePathname } from "next/navigation";

/* ⚡ Cathlab JARVIS TabBar v2.6 – Gold-Cyan Hybrid (Z-Index Fixed)
   🔹 Auto-highlight tab aktif berdasarkan URL (usePathname)
   🔹 Glow emas–cyan + Active-Line Motion
   🔹 Safe hydration + responsive scroll glow
   🔹 z-[60] agar tidak menutupi modal
   🔹 Author: Habibur Rahman
*/

export default function TabBar() {
  const { tabs, activeTab, setActiveTab, closeTab, addTab } = useTabContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [glowLeft, setGlowLeft] = useState(false);
  const [glowRight, setGlowRight] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* 🧭 Prevent SSR mismatch */
  useEffect(() => setMounted(true), []);

  /* 🧩 Pastikan tab Dashboard selalu ada */
  useEffect(() => {
    if (mounted && !tabs.some((t) => t.id === "dashboard")) {
      addTab({ id: "dashboard", label: "Dashboard Utama", fixed: true });
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

  /* 🧠 Sinkronisasi tab aktif hanya sekali saat awal load (bukan tiap URL) */
  useEffect(() => {
    if (!pathname || tabs.length === 0) return;
    const lastSegment = pathname.split("/").pop() || "dashboard";
    if (!tabs.some((t) => t.id === lastSegment)) return;
    setActiveTab(lastSegment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative z-[30] select-none" // ← FIX: layer di bawah modal
      suppressHydrationWarning
    >
      {/* 🔷 Main Tab Container */}
      <div
        ref={containerRef}
        className="flex items-center gap-2 px-4 py-2
                   bg-[#04070d]/70 backdrop-blur-xl
                   border-b border-cyan-500/20
                   shadow-[0_0_15px_rgba(0,255,255,0.25)]
                   overflow-x-auto hide-scrollbar"
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
                exit={{ scale: 0.8, opacity: 0, y: -5 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
              >
                <button
                  onClick={() => setActiveTab(tab.id)}
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import { useTabContext } from "@/contexts/TabContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { menuConfig } from "@/app/config/menuConfig";

/* ⚡ Cathlab JARVIS TabBar v2.8 – Ringan + scroll ke tab aktif
   🔹 Tanpa AnimatePresence/spring per pill (DOM + komposit lebih murah)
   🔹 Garis aktif tetap shared layoutId + LayoutGroup
   🔹 Glow samping pakai CSS transition (bukan motion)
   🔹 content-visibility pada pill membantu saat strip panjang
   🔹 Tab aktif di-scroll ke dalam viewport strip bila terpotong
*/

export default function TabBar() {
  const { tabs, activeTab, setActiveTab, closeTab, addTab, closeAllTabs } = useTabContext();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [glowLeft, setGlowLeft] = useState(false);
  const [glowRight, setGlowRight] = useState(false);
  const [mounted, setMounted] = useState(false);

  const hrefByTabId = useMemo(() => {
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
    if (!map.has("dashboard")) map.set("dashboard", "/dashboard");
    if (!map.has("tindakan")) map.set("tindakan", "/dashboard/layanan/tindakan");
    return map;
  }, []);

  /* 🧭 Prevent SSR mismatch */
  useEffect(() => setMounted(true), []);

  /* 🧩 Pastikan tab Dashboard selalu ada */
  useEffect(() => {
    if (mounted && !tabs.some((t) => t.id === "dashboard")) {
      // Jangan override activeTab (URL sync bisa sedang mengarah ke /system/*)
      addTab({ id: "dashboard", label: "Dashboard Utama", fixed: true }, { skipActivate: true });
    }
  }, [mounted, tabs, addTab]);

  const tabCount = tabs.length;

  /* 🌈 Scroll glow: depend on tab count (lebar strip), bukan referensi tabs[] */
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
  }, [tabCount]);

  /* Gulir strip horizontal agar tab aktif tidak tertutup (banyak tab / layar sempit) */
  useEffect(() => {
    if (!mounted) return;
    const container = containerRef.current;
    if (!container) return;

    const run = () => {
      let sel: string;
      try {
        sel = `[data-tabbar-tab="${CSS.escape(activeTab)}"]`;
      } catch {
        sel = `[data-tabbar-tab="${String(activeTab).replace(/"/g, "\\\"")}"]`;
      }
      const item = container.querySelector(sel);
      if (!item || !(item instanceof HTMLElement)) return;

      const pad = 10;
      const c = container.getBoundingClientRect();
      const r = item.getBoundingClientRect();
      const overLeft = r.left < c.left + pad;
      const overRight = r.right > c.right - pad;
      if (!overLeft && !overRight) return;

      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      let next = container.scrollLeft;
      if (overLeft) next += r.left - c.left - pad;
      if (overRight) next += r.right - c.right + pad;
      container.scrollTo({
        left: Math.max(0, Math.min(maxScroll, next)),
        behavior: "smooth",
      });
    };

    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(run);
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [activeTab, mounted, tabCount]);

  // Sinkron URL ↔ tab ditangani di TabContext (biar konsisten dengan mapping menuConfig)

  return (
    <div
      className="relative z-[30] select-none" // ← FIX: layer di bawah modal
      suppressHydrationWarning
    >
      {/* 🔷 Main Tab Container — min-h agar tidak collapse saat banyak tab ditutup */}
      <div
        className={cn(
          "relative flex items-center min-h-[48px] backdrop-blur-md border-b transition-colors duration-500",
          isLight
            ? "bg-slate-100/90 border-cyan-600/25 shadow-sm"
            : "bg-[#04070d]/70 border-cyan-500/20 shadow-[0_0_15px_rgba(0,255,255,0.25)]"
        )}
      >
        <LayoutGroup id="tabbar-tabs">
          <div
            ref={containerRef}
            className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-4 overflow-x-auto hide-scrollbar"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  data-tabbar-tab={tab.id}
                  className="shrink-0"
                  style={{
                    contentVisibility: "auto",
                    containIntrinsicSize: "auto 44px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const href = hrefByTabId.get(tab.id);
                      if (href) {
                        router.push(href, { scroll: false });
                      } else {
                        setActiveTab(tab.id);
                      }
                    }}
                    className={cn(
                      "group relative flex items-center gap-1.5 px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2 rounded-full border transition-colors duration-200",
                      isActive
                        ? isLight
                          ? "border-[#b8860b]/65 bg-gradient-to-r from-white to-cyan-50/95 text-cyan-900 shadow-sm"
                          : "border-[#D4AF37]/70 bg-gradient-to-r from-[#0e141d]/90 to-[#16222e]/90 text-cyan-200 shadow-[0_0_12px_rgba(212,175,55,0.3),0_0_16px_rgba(0,255,255,0.25)]"
                        : isLight
                          ? "border-transparent text-slate-600 hover:text-cyan-800 hover:bg-cyan-500/10"
                          : "border-transparent text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/5"
                    )}
                  >
                    <span className="font-bold whitespace-nowrap">
                      {tab.label}
                    </span>

                    {!tab.fixed && (
                      <X
                        size={14}
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        className="opacity-50 hover:opacity-100 hover:text-rose-400 transition-opacity"
                      />
                    )}

                    {isActive && (
                      <motion.div
                        layoutId="active-line"
                        className="absolute bottom-0 left-[15%] right-[15%] h-[2px]
                                   bg-gradient-to-r from-[#D4AF37]/80 via-cyan-300/90 to-[#D4AF37]/80
                                   shadow-[0_0_10px_#00ffff,0_0_15px_#D4AF37]"
                        transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </LayoutGroup>

        {/* 🧹 Tutup semua tab (sisakan Dashboard) */}
        <div className="flex-shrink-0 pr-1 sm:pr-2">
          <button
            type="button"
            onClick={() => closeAllTabs()}
            disabled={tabs.length <= 1}
            className={cn(
              "p-2 rounded-lg border border-transparent transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none",
              isLight
                ? "text-slate-600 hover:text-cyan-800 hover:bg-cyan-500/15 hover:border-cyan-600/25"
                : "text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/30"
            )}
            title="Tutup semua tab"
            aria-label="Tutup semua tab"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* 🔹 Glow samping — CSS saja */}
      <div
        className={`pointer-events-none absolute top-0 left-0 h-full w-10 bg-gradient-to-r from-cyan-400/40 to-transparent blur-sm transition-opacity duration-200 ${
          glowLeft ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-cyan-400/40 to-transparent blur-sm transition-opacity duration-200 ${
          glowRight ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
    </div>
  );
}

"use client";

import { motion, LazyMotion, domAnimation } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useUI } from "@app/contexts/UIContext";
import { useTabs } from "@app/contexts/TabContext";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TabBar from "@/components/TabBar";
import TabContent from "@/components/TabContent";
import BottomNav from "@/components/BottomNav";
import JarvisLoader from "@/components/JarvisLoader";
import useGlobalLoader from "@/components/useGlobalLoader";

/* ⚙️ Cathlab JARVIS LayoutContainer v7.5 – Scroll-Blur Edition
   💠 Scroll blur parallax effect for TabBar
   ✅ Adaptive responsive height
   ✅ Hook-safe & smooth animation
*/

export default function LayoutContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { motionX } = useUI();
  const { activeTab } = useTabs();
  const loading = useGlobalLoader();

  /* 🧩 Mount state */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* 🔁 Scroll to top setiap kali tab berubah */
  useEffect(() => {
    if (!mounted) return;
    const scrollArea = document.querySelector("main");
    if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab, mounted]);

  /* 📏 Hitung tinggi header (Topbar + TabBar) */
  const headerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState("calc(100vh - 110px)");
  const [blurOpacity, setBlurOpacity] = useState(0); // 🌫️ nilai blur dinamis

  useEffect(() => {
    function updateHeight() {
      const headerHeight = headerRef.current?.offsetHeight || 110;
      setContentHeight(`calc(100vh - ${headerHeight}px)`);
    }
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  /* 🌫️ Pantau scroll untuk efek blur */
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const scrollY = e.currentTarget.scrollTop;
    const maxBlur = 12;
    const maxOpacity = 0.6;
    const ratio = Math.min(scrollY / 120, 1); // batas responsif
    setBlurOpacity(ratio * maxOpacity);
  };

  if (!mounted) return <div className="min-h-screen bg-[#0b111a]" />;

  const safeLoading =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/dashboard")
      ? false
      : loading;

  return (
    <LazyMotion features={domAnimation}>
      <motion.div
        layout="position"
        className="flex h-screen bg-[#0b111a] text-gray-100 overflow-hidden"
      >
        {/* 🧩 Sidebar */}
        <Sidebar />

        {/* 💠 Main Area */}
        <motion.div
          layout="position"
          style={{ marginLeft: motionX }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex flex-col flex-grow h-screen transition-all duration-150 ease-out"
        >
          {/* 🟦 Header (Topbar + TabBar) */}
          <div
            ref={headerRef}
            className="flex flex-col relative z-[200] transition-all duration-300"
            style={{
              backdropFilter: `blur(${blurOpacity * 15}px)`,
              backgroundColor: `rgba(0, 0, 0, ${blurOpacity * 0.6})`,
              borderBottom:
                blurOpacity > 0.05
                  ? "1px solid rgba(0,255,255,0.2)"
                  : "1px solid transparent",
              boxShadow:
                blurOpacity > 0.1 ? "0 2px 10px rgba(0,255,255,0.2)" : "none",
            }}
          >
            <Topbar />
            <TabBar />
          </div>

          {/* 🌌 Scrollable Content */}
          <main
            onScroll={handleScroll}
            className="overflow-y-auto scroll-smooth scrollbar-thin hide-scrollbar p-3 md:p-6"
            style={{
              flex: 1,
              minHeight: 0,
              height: contentHeight,
            }}
          >
            <motion.div
              key={activeTab}
              initial={{ opacity: 0.85, scale: 0.995 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="rounded-2xl bg-gradient-to-br from-cyan-900/20 via-black/60 to-black/80 p-1"
            >
              <motion.div
                animate={{
                  opacity: [0.9, 1],
                  filter: ["blur(2px)", "blur(0px)"],
                }}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className="rounded-2xl"
              >
                <TabContent />
              </motion.div>
            </motion.div>
          </main>

          {/* 🔹 Bottom Navigation (mobile only) */}
          <BottomNav />
        </motion.div>

        {/* 🛰️ Global Loader */}
        {safeLoading && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <JarvisLoader mode="dashboard" />
          </motion.div>
        )}
      </motion.div>
    </LazyMotion>
  );
}

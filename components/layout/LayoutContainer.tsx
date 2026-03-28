"use client";

import { useEffect, useState } from "react";
import {
  LazyMotion,
  domAnimation,
  motion,
  AnimatePresence,
} from "framer-motion";
import { useUI } from "@/contexts/UIContext";
import { useSession } from "@/contexts/SessionContext";
import LayoutSidebar from "./LayoutSidebar";
import LayoutHeader from "./LayoutHeader";
import LayoutMain from "./LayoutMain";
import LayoutLoader from "./LayoutLoader";

/*───────────────────────────────────────────────
 ⚙️ LayoutContainer – Cathlab JARVIS Mode v4.2 Stable
   🔹 Auto refresh token (GET) tiap 50 menit
   🔹 Sinkron dengan SessionContext global
   🔹 Indikator hologram cyan-gold + tooltip
   🔹 Stealth mode (hilang 10 dtk idle)
───────────────────────────────────────────────*/
export default function LayoutContainer() {
  const { isSidebarOpen, motionX, sidebarWidth, collapsed, isMobile } = useUI();
  const { role, lastRefresh, setSession } = useSession();

  const [blink, setBlink] = useState(false);
  const [visible, setVisible] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null);

  const SIDEBAR_OPEN = sidebarWidth;
  const SIDEBAR_COLLAPSED = 80;
  /** HP: sidebar overlay penuh lebar; tanpa rail saat tertutup. Desktop: ikuti collapsed / expanded. */
  const contentMargin = isMobile
    ? 0
    : !isSidebarOpen
      ? SIDEBAR_COLLAPSED
      : collapsed
        ? SIDEBAR_COLLAPSED
        : SIDEBAR_OPEN;

  /* ⚙️ Sinkronisasi margin sidebar */
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${contentMargin}px`
    );
  }, [contentMargin]);

  /* 🔁 Auto refresh token */
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        if (data.ok) {
          console.log("🔁 Token diperbarui:", data.message);
          setBlink(true);
          setVisible(true);
          setSession({
            ...(typeof data.username === "string" && { username: data.username }),
            role: data.role || "user",
            lastRefresh: new Date().toLocaleTimeString(),
          });
          setTimeout(() => setBlink(false), 1800);
        } else {
          console.warn("⚠️ Refresh gagal:", data.message);
              // Reset supaya UI tidak "nyangkut" role sebelumnya (mis. admin).
              setSession({
                username: "unknown",
                role: "guest",
                lastRefresh: null,
                refreshCount: 0,
              });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const looksOffline =
          (err instanceof TypeError &&
            /failed to fetch|load failed|network/i.test(msg)) ||
          /err_connection_refused/i.test(msg);
        if (looksOffline) {
          console.warn(
            "⚠️ Server tidak terjangkau (refresh token ditunda). Jalankan dev server atau cek port.",
          );
          return;
        }
        console.warn("⚠️ Gagal menghubungi refresh endpoint:", err);
        setSession({
          username: "unknown",
          role: "guest",
          lastRefresh: null,
          refreshCount: 0,
        });
      }
    };

    refresh(); // refresh awal
    const interval = setInterval(refresh, 50 * 60 * 1000); // 50 menit
    return () => clearInterval(interval);
  }, [setSession]);

  /* 🕵️ Mode Stealth – hilang setelah 10 dtk idle */
  useEffect(() => {
    const resetTimer = () => {
      setVisible(true);
      if (idleTimer) clearTimeout(idleTimer);
      const timer = setTimeout(() => setVisible(false), 10 * 1000);
      setIdleTimer(timer);
    };

    const events = ["mousemove", "keydown", "click", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <motion.div className="relative flex h-screen bg-[#0b111a] text-gray-100 overflow-x-hidden">
        {/* 🧩 Sidebar */}
        <motion.aside
          className="fixed left-0 top-0 h-screen z-[40] bg-[#0d141f] border-r border-cyan-900/40 overflow-hidden"
          style={{ width: motionX }}
        >
          <LayoutSidebar />
        </motion.aside>

        {/* 💠 Konten utama */}
        <motion.div
          animate={{ marginLeft: contentMargin }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="flex flex-col h-screen flex-grow relative z-[10]"
        >
          <LayoutHeader />
          <LayoutMain />
        </motion.div>

        {/* ⏳ Loader Global */}
        <LayoutLoader />

        {/* 🌐 Indikator Refresh Token + Tooltip */}
        <AnimatePresence>
          {visible && (
            <motion.div
              className="fixed z-[9999] flex flex-col gap-1 max-md:bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] max-md:left-3 max-md:right-auto max-md:items-start md:bottom-4 md:right-4 md:left-auto md:items-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              {/* Tooltip */}
              <AnimatePresence>
                {showTooltip && (
                  <motion.div
                    className="mb-1 px-3 py-2 rounded-lg bg-black/80 text-[11px] text-cyan-200 border border-cyan-700/40 shadow-[0_0_12px_rgba(0,255,255,0.25)]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p>{`Role: ${role || "user"}`}</p>
                    <p>{`Last refresh: ${lastRefresh || "–"}`}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hologram dot */}
              <motion.div
                className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(0,255,255,0.6)] cursor-pointer"
                animate={{
                  scale: blink ? [1, 1.8, 1] : 1,
                  opacity: blink ? [1, 0.3, 1] : 0.7,
                  boxShadow: blink
                    ? [
                        "0 0 8px rgba(0,255,255,0.6)",
                        "0 0 25px rgba(212,175,55,0.9)",
                        "0 0 8px rgba(0,255,255,0.6)",
                      ]
                    : "0 0 10px rgba(0,255,255,0.4)",
                }}
                transition={{ duration: 1.6 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </LazyMotion>
  );
}

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useUI } from "@app/contexts/UIContext";
import { useTabs } from "@app/contexts/TabContext";
import { menuConfig } from "@app/config/menuConfig";

/* ⚙️ Cathlab JARVIS Sidebar v5.6.5 – Gold-Cyan Hybrid
   ✅ Sinkron penuh dengan TabContext v6.4 & LayoutContainer v4.1
   ✅ Suara klik + vibrasi
   ✅ Tooltip mini saat collapsed
   ✅ Mobile overlay + animasi halus
*/

export default function Sidebar() {
  const {
    isSidebarOpen,
    toggleSidebar,
    collapsed,
    setCollapsed,
    motionX,
    isMobile,
  } = useUI();
  const { addTab, activeTab, setActiveTab } = useTabs();

  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const sidebarWidth = useTransform(motionX, [80, 288], ["5rem", "16rem"]);
  const sidebarOffset = useTransform(motionX, [80, 288], [0, 6]);

  useEffect(() => setMounted(true), []);

  const handleChevron = () => {
    if (isMobile) toggleSidebar();
    else setCollapsed((prev) => !prev);
    navigator.vibrate?.([10, 25]);
  };

  const handleMenuClick = (item: any) => {
    const clickSound = new Audio("/sfx/click.mp3");
    clickSound.volume = 0.25;
    clickSound.play().catch(() => {});
    navigator.vibrate?.(15);

    addTab({ id: item.id, label: item.label });
    setActiveTab(item.id);
    if (typeof window !== "undefined")
      window.history.replaceState({}, "", "/dashboard");
    if (isMobile) toggleSidebar();
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isSidebarOpen && (
        <motion.aside
          key="sidebar"
          layout="position"
          style={{ width: sidebarWidth, x: sidebarOffset }}
          initial={{ x: -260, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -260, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed top-0 left-0 z-[400] h-screen flex flex-col justify-between
                     bg-gradient-to-b from-[#090e16]/95 via-[#0c1925]/90 to-[#0b1b28]/90
                     backdrop-blur-2xl border-r border-cyan-500/20
                     shadow-[0_0_35px_rgba(0,255,255,0.25)] text-left"
          suppressHydrationWarning
        >
          {/* HEADER */}
          <motion.header
            layout
            className="relative flex flex-col items-center justify-center px-4 py-3 border-b border-cyan-500/20 space-y-2"
          >
            <motion.button
              onClick={handleChevron}
              whileTap={{ scale: 0.9 }}
              animate={{ rotate: collapsed ? 0 : 180 }}
              transition={{ type: "spring", stiffness: 120, damping: 12 }}
              className="absolute right-3 top-3 p-1.5 rounded-md text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20 transition-all"
            >
              {collapsed ? (
                <ChevronRight size={22} />
              ) : (
                <ChevronLeft size={22} />
              )}
            </motion.button>

            <button
              onClick={toggleSidebar}
              className="absolute left-3 top-3 md:hidden p-1 text-cyan-400 hover:text-cyan-200 transition-all"
            >
              <X size={22} />
            </button>

            <motion.div
              layout
              className="flex flex-col items-center justify-center mt-5 space-y-1"
            >
              <motion.div
                animate={{
                  rotate: collapsed ? 360 : 0,
                  scale: collapsed ? 0.9 : 1,
                }}
                transition={{ duration: 0.6, type: "spring" }}
                className="relative w-8 h-8 rounded-full overflow-hidden shadow-[0_0_12px_rgba(0,255,255,0.6)]"
              >
                <Image
                  src="/logo-idik.png"
                  alt="Logo IDIK"
                  fill
                  priority
                  sizes="32px"
                  className="object-cover rounded-full"
                />
              </motion.div>

              <AnimatePresence mode="wait">
                {!collapsed && mounted && (
                  <motion.h2
                    key="idik"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    className="text-lg font-bold tracking-[0.35em] text-cyan-300 drop-shadow-[0_0_6px_#00e0ff]"
                  >
                    I.D.I.K
                  </motion.h2>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.header>

          {/* MENU */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-3 hide-scrollbar">
            {menuConfig.map((group) => (
              <div key={group.group}>
                {!collapsed && (
                  <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-500/60 mb-1 ml-2">
                    {group.group}
                  </h3>
                )}

                {group.items.map((item: any) => {
                  const isActive = activeTab === item.id;
                  const isHovered = hovered === item.id;

                  return (
                    <div key={item.id} className="relative">
                      <motion.button
                        title={item.label}
                        onClick={() => handleMenuClick(item)}
                        onMouseEnter={() => setHovered(item.id)}
                        onMouseLeave={() => setHovered(null)}
                        whileHover={{ scale: 1.05, x: 4 }}
                        whileTap={{ scale: 0.97 }}
                        className={`relative w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
                          ${
                            isActive
                              ? "bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 shadow-[0_0_20px_rgba(0,255,255,0.4)]"
                              : "border border-cyan-500/10 bg-[rgba(0,224,255,0.03)] text-gray-300 hover:bg-[rgba(0,224,255,0.1)] hover:border-cyan-500/30 hover:text-cyan-300"
                          }`}
                      >
                        <motion.div
                          animate={
                            isActive
                              ? {
                                  scale: [1, 1.2, 1],
                                  filter: [
                                    "drop-shadow(0_0_8px_#00ffff)",
                                    "drop-shadow(0_0_16px_#FFD700)",
                                    "drop-shadow(0_0_8px_#00ffff)",
                                  ],
                                }
                              : {
                                  scale: isHovered ? [1, 1.15, 1] : 1,
                                  filter: isHovered
                                    ? "drop-shadow(0_0_10px_#00ffff)"
                                    : "drop-shadow(0_0_4px_#00ffff50)",
                                }
                          }
                          transition={{
                            duration: isActive ? 2 : 0.6,
                            repeat: isActive ? Infinity : 0,
                            ease: "easeInOut",
                          }}
                          className="flex-shrink-0"
                        >
                          {item.icon}
                        </motion.div>

                        {!collapsed && <span>{item.label}</span>}
                      </motion.button>

                      {collapsed && isHovered && (
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.25 }}
                          className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap
                                     bg-cyan-950/90 text-cyan-100 px-3 py-1.5 text-xs rounded-lg border border-cyan-500/30
                                     shadow-[0_0_12px_rgba(0,255,255,0.25)] backdrop-blur-md"
                        >
                          {item.label}
                        </motion.div>
                      )}
                    </div>
                  );
                })}

                <div className="border-b border-cyan-500/10 my-3" />
              </div>
            ))}
          </nav>

          {/* FOOTER */}
          <motion.footer
            layout
            className="px-3 py-3 border-t border-cyan-500/20 text-center text-[11px] text-cyan-500/70 tracking-widest"
          >
            <p className="font-semibold text-cyan-400 drop-shadow-[0_0_4px_#00e0ff]">
              CATHLAB JARVIS
            </p>
            <p className="text-cyan-600/70">v5.6.5 • Gold-Cyan Hybrid</p>
            <p className="text-gray-500/50 mt-0.5">IDIK-APP 2025</p>
          </motion.footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

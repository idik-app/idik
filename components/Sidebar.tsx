"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, PanelLeftOpen } from "lucide-react";
import { useUI } from "@/contexts/UIContext";
import { useTabs } from "@/contexts/TabContext";
import { useRouter } from "next/navigation";
import { menuConfig } from "@/app/config/menuConfig";

/* ⚙️ Cathlab JARVIS Sidebar v6.3-NeuralPulse
   🧠 Neural pulse → HUD
   ✨ Holographic edge + energy path
   💾 Memory + Perf-aware
*/

type MenuItem = {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
};

type MenuGroup = {
  group: string;
  items: MenuItem[];
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

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
  const router = useRouter();

  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    (typeof menuConfig !== "undefined" && Array.isArray(menuConfig)
      ? (menuConfig as MenuGroup[]).map((g) => g.group)
      : ["Main"])
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const firstActionRef = useRef<HTMLButtonElement | null>(null);
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const groups = menuConfig as MenuGroup[];

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const sC = safeJsonParse<boolean>(
      localStorage.getItem("idik-sidebar-collapsed"),
      collapsed
    );
    const defaultGroups =
      (menuConfig as MenuGroup[]).map((g) => g.group);
    const sG = safeJsonParse<string[]>(
      localStorage.getItem("idik-sidebar-groups"),
      defaultGroups
    );
    setCollapsed(sC);
    setOpenGroups(sG);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    localStorage.setItem("idik-sidebar-collapsed", JSON.stringify(collapsed));
    localStorage.setItem("idik-sidebar-groups", JSON.stringify(openGroups));
  }, [collapsed, openGroups]);
  useEffect(() => {
    if (collapsed) setOpenGroups(groups.map((g) => g.group));
  }, [collapsed, groups]);

  useEffect(() => {
    if (!isMobile) return;
    if (!isSidebarOpen) return;
    // focus first actionable item for keyboard users
    const t = window.setTimeout(() => firstActionRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isMobile, isSidebarOpen]);

  useEffect(() => {
    if (!isMobile || !isSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleSidebar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobile, isSidebarOpen, toggleSidebar]);

  const handleChevron = () => {
    if (isMobile) toggleSidebar();
    else setCollapsed((p) => !p);
    navigator.vibrate?.([10, 25]);
  };

  /* Desktop: mouse masuk sidebar → expand; mouse keluar → collapse (delay) */
  const handleSidebarMouseEnter = () => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    if (!isMobile) setCollapsed(false);
  };
  const handleSidebarMouseLeave = () => {
    if (isMobile) return;
    collapseTimeoutRef.current = setTimeout(() => setCollapsed(true), 380);
  };
  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  const handleMenuClick = (item: MenuItem) => {
    // Tambah tab tanpa memaksa override URL sync; aktivasi dilakukan eksplisit di bawah
    addTab({ id: item.id, label: item.label }, { activate: false });
    window.dispatchEvent(
      new CustomEvent("jarvis-neuralpulse", { detail: { tab: item.id } })
    ); // 🔗 send pulse
    // URL harus jadi sumber kebenaran. Kalau ada href, cukup push; TabContext akan sync activeTab dari URL.
    if (item.href) router.push(item.href);
    else setActiveTab(item.id);
    if (isMobile) toggleSidebar();
  };

  const toggleGroup = (g: string) => {
    if (collapsed) return;
    setOpenGroups((p) =>
      p.includes(g) ? p.filter((x) => x !== g) : [...p, g]
    );
  };

  return (
    <>
      {/* Soft easing: ease-out curve untuk transisi halus */}
      <AnimatePresence initial={false}>
        {isMobile && isSidebarOpen && (
          <motion.button
            key="sidebar-backdrop"
            type="button"
            aria-label="Close sidebar"
            onClick={toggleSidebar}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.4,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="fixed inset-0 z-[35] bg-black/50 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {/* Saat sidebar tertutup: tampilkan strip minimal agar user bisa buka lagi */}
      {!isSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 py-4 bg-gradient-to-b from-[#090e16]/95 to-[#0b1b28]/90 border-r border-cyan-500/20"
          role="navigation"
          aria-label="Sidebar tertutup – buka untuk menu"
        >
          <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-[0_0_12px_rgba(0,255,255,0.4)]">
            <Image
              src="/logo-idik.png"
              alt="IDIK"
              fill
              sizes="40px"
              className="object-cover rounded-full"
            />
          </div>
          <motion.button
            type="button"
            onClick={toggleSidebar}
            className="p-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors"
            aria-label="Buka menu sidebar"
            title="Buka menu"
          >
            <PanelLeftOpen size={24} />
          </motion.button>
          <span className="text-[10px] text-cyan-500/80 font-medium tracking-wider rotate-0 text-center px-1">
            Buka menu
          </span>
        </motion.div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {isSidebarOpen && (
          <motion.div
            key="sidebar"
            role="navigation"
            aria-label="Sidebar navigation"
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.45,
              ease: [0.4, 0, 0.2, 1],
            }}
            onMouseEnter={handleSidebarMouseEnter}
            onMouseLeave={handleSidebarMouseLeave}
            className="relative z-[40] h-full flex flex-col justify-between
              bg-gradient-to-b from-[#090e16]/95 via-[#0c1925]/90 to-[#0b1b28]/90
              backdrop-blur-2xl border-r border-cyan-500/20 shadow-[0_0_35px_rgba(0,255,255,0.25)]"
          >
          {/* HEADER */}
          <motion.header
            layout
            className="relative flex flex-col items-center justify-center px-4 py-3 border-b border-cyan-500/20 space-y-2"
          >
            <motion.button
              type="button"
              onClick={handleChevron}
              className="absolute right-3 top-3 p-1.5 rounded-md text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20"
              aria-label={isMobile ? "Tutup sidebar" : "Expand/collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight size={22} />
              ) : (
                <ChevronLeft size={22} />
              )}
            </motion.button>
            <motion.div
              layout
              className="flex flex-col items-center justify-center mt-5 space-y-1"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-[0_0_15px_rgba(0,255,255,0.7)]">
                <Image
                  src="/logo-idik.png"
                  alt="Logo IDIK"
                  fill
                  priority
                  sizes="32px"
                  className="object-cover rounded-full"
                />
              </div>
              {(!collapsed || isMobile) && mounted && (
                <motion.h2
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  className="text-lg font-bold tracking-[0.35em] text-cyan-300 drop-shadow-[0_0_6px_#00e0ff]"
                >
                  I.D.I.K
                </motion.h2>
              )}
            </motion.div>
          </motion.header>

          {/* MENU */}
          <LayoutGroup>
            <nav
              ref={scrollRef}
              className="flex-1 overflow-y-auto py-4 px-3 space-y-3 hide-scrollbar"
            >
              {groups.map((group) => {
                const isOpen = openGroups.includes(group.group);
                const groupId = `sidebar-group-${group.group
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`;
                return (
                  <div key={group.group} className="mb-3">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.group)}
                      className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold uppercase tracking-widest text-cyan-500/70 hover:text-yellow-400"
                      aria-expanded={collapsed ? false : isOpen}
                      aria-controls={groupId}
                    >
                      {(!collapsed || isMobile) && <span>{group.group}</span>}
                      <motion.div
                        animate={{ rotate: isOpen ? 90 : 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className={collapsed && !isMobile ? "mx-auto" : ""}
                      >
                        <ChevronRight size={16} />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.ul
                          key={`${group.group}-menu`}
                          id={groupId}
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                          className="pl-2 mt-1 space-y-1.5 border-l-2 border-cyan-700/30"
                        >
                          {group.items.map((item, idx) => {
                            const isActive = activeTab === item.id;
                            const isHovered = hovered === item.id;
                            return (
                              <li key={item.id} className="list-none">
                                <motion.button
                                ref={
                                  mounted &&
                                  !collapsed &&
                                  group.group === "Main" &&
                                  idx === 0
                                    ? firstActionRef
                                    : undefined
                                }
                                key={item.id}
                                layout
                                aria-label={item.label}
                                onClick={() => handleMenuClick(item)}
                                onMouseEnter={() => setHovered(item.id)}
                                onMouseLeave={() => setHovered(null)}
                                type="button"
                                whileHover={
                                  !prefersReducedMotion
                                    ? { scale: 1.02, x: 2 }
                                    : {}
                                }
                                whileTap={
                                  !prefersReducedMotion ? { scale: 0.98 } : {}
                                }
                                transition={{ type: "tween", duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                className={`relative flex items-center rounded-xl text-sm font-medium w-full transition-all overflow-hidden py-2 ${
                                  collapsed && !isMobile
                                    ? "justify-center px-2"
                                    : "justify-start gap-2.5 px-3.5 text-left"
                                } ${
                                  isActive
                                    ? "bg-[rgba(0,224,255,0.08)] border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                                    : "border border-cyan-500/10 bg-[rgba(0,224,255,0.03)] text-gray-300 hover:bg-[rgba(0,224,255,0.1)] hover:border-cyan-500/40 hover:text-cyan-300"
                                }`}
                              >
                                <div
                                  className={`relative flex items-center justify-center flex-shrink-0 ${
                                    collapsed && !isMobile ? "w-full" : ""
                                  }`}
                                >
                                  <motion.div
                                    animate={
                                      !prefersReducedMotion &&
                                      (isActive
                                        ? { scale: [1, 1.15, 1] }
                                        : { scale: isHovered ? 1.08 : 1 })
                                    }
                                    transition={{ duration: 0.6 }}
                                    className={`flex-shrink-0 p-1 rounded-md ${
                                      isHovered || isActive
                                        ? "animate-[neural-pulse_0.6s_ease-out_1]"
                                        : ""
                                    }`}
                                  >
                                    {item.icon}
                                  </motion.div>
                                  {/* Tooltip saat collapsed (desktop) */}
                                  {collapsed && !isMobile && isHovered && (
                                    <motion.div
                                      initial={{ opacity: 0, x: 6 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: 6 }}
                                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                                      className="absolute left-10 top-1/2 -translate-y-1/2 z-[9999]
                                        bg-[#0b1b28]/95 border border-cyan-400/40 text-cyan-100 text-xs px-2.5 py-1 rounded-md whitespace-nowrap
                                        shadow-[0_0_12px_rgba(0,255,255,0.4)]"
                                    >
                                      {item.label}
                                    </motion.div>
                                  )}
                                </div>
                                {(!collapsed || isMobile) && (
                                  <span className="truncate">{item.label}</span>
                                )}
                                </motion.button>
                              </li>
                            );
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                    <div className="border-b border-cyan-500/10 mt-3" />
                  </div>
                );
              })}
            </nav>
          </LayoutGroup>

          {/* FOOTER — sembunyikan teks saat collapsed (desktop) */}
          <motion.footer
            layout
            className="px-3 py-3 border-t border-cyan-500/20 text-center text-[11px] text-cyan-500/70 tracking-widest"
          >
            {(!collapsed || isMobile) && (
              <>
                <p className="font-semibold text-cyan-400 drop-shadow-[0_0_4px_#00e0ff]">
                  CATHLAB JARVIS
                </p>
                <p className="text-cyan-600/70">v6.3-NeuralPulse</p>
                <p className="text-gray-500/50 mt-0.5">IDIK-APP 2025</p>
              </>
            )}
          </motion.footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useAI } from "@/app/contexts/AIContext";
import JarvisAgent from "./JarvisAgent";
import { useUI } from "@/contexts/UIContext";
import { useSession } from "@/contexts/SessionContext";
import { UI_LAYERS } from "@/lib/ui/layers";
import { cn } from "@/lib/utils";
import Portal from "./Portal";
import { useRouter, usePathname } from "next/navigation";
import { 
  House, 
  Users, 
  Stethoscope, 
  Activity, 
  Box, 
  Database,
  X 
} from "lucide-react";

interface TargetPosition {
  x: number;
  y: number;
  label?: string;
}

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: <House size={20} />, href: "/dashboard", color: "#22d3ee" },
  { id: "pasien", label: "Pasien", icon: <Users size={20} />, href: "/dashboard/pasien", color: "#a855f7" },
  { id: "dokter", label: "Dokter", icon: <Stethoscope size={20} />, href: "/dashboard/dokter", color: "#eab308" },
  { id: "tindakan", label: "Tindakan", icon: <Activity size={20} />, href: "/dashboard/layanan/tindakan", color: "#10b981" },
  { id: "inventaris", label: "Inventaris", icon: <Box size={20} />, href: "/dashboard/inventaris", color: "#f43f5e" },
  { id: "database", label: "Database", icon: <Database size={20} />, href: "/system/database", color: "#6366f1" },
];

export default function JarvisFloatingAgent() {
  const router = useRouter();
  const pathname = usePathname();
  const { mode: aiMode } = useAI();
  const { themeMode } = useUI();
  const { username, role } = useSession();
  const controls = useAnimation();
  const [target, setTarget] = useState<TargetPosition | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isPatrolling, setIsPatrolling] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const isMounted = useRef(true);
  /** Harus true agar useAnimation terhubung ke motion.div (bukan saat return null). */
  const showAgentRef = useRef(false);

  const isLoggedIn = username !== "unknown" && role !== "guest";

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // --- Exclude certain routes ---
  const isExcludedRoute = 
    pathname === "/" ||
    pathname?.startsWith("/distributor") || 
    pathname?.startsWith("/depo") || 
    pathname?.startsWith("/cssd");

  const showAgent = isVisible && !isExcludedRoute;

  useLayoutEffect(() => {
    showAgentRef.current = showAgent;
  }, [showAgent]);

  useEffect(() => {
    if (!showAgent) {
      void controls.stop();
    }
  }, [showAgent, controls]);

  /** Framer Motion: controls.start/set hanya aman setelah motion dengan animate={controls} sudah mount. */
  function waitForControlsHost(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  // --- Initial Position (Force Center for Visibility) ---
  useEffect(() => {
    if (!showAgent) return;
    const timer = setTimeout(() => {
      if (!showAgentRef.current || !isMounted.current) return;
      void waitForControlsHost().then(() => {
        if (!showAgentRef.current || !isMounted.current) return;
        const centerX = window.innerWidth / 2 - 100;
        const centerY = window.innerHeight / 2 - 150;
        void controls.set({ x: centerX, y: centerY, opacity: 1, scale: 1 });
        console.log("🤖 Jarvis Agent Positioned at Center:", centerX, centerY);
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [controls, showAgent]);

  // --- Force Always Visible for Debugging ---
  useEffect(() => {
    setIsVisible(true);
  }, [aiMode]);

  // --- Stop movement when menu opens or mouse is interacting ---
  useEffect(() => {
    if (!showAgentRef.current) return;
    if (isOpen || isInteracting) {
      void controls.stop();
    }
  }, [isOpen, isInteracting, controls, showAgent]);

  const startPatrol = useCallback(async () => {
    if (isPatrolling || isOpen || isInteracting) return;
    if (!showAgentRef.current) return;
    setIsPatrolling(true);

    // Initial wait to let user see Jarvis at center
    await new Promise((r) => setTimeout(r, 6000));

    await waitForControlsHost();

    while (true) {
      if (
        !isMounted.current ||
        !showAgentRef.current ||
        target ||
        isOpen ||
        isInteracting
      ) {
        setIsPatrolling(false);
        return;
      }

      const nextX = Math.random() * (window.innerWidth - 250) + 125;
      const nextY = Math.random() * (window.innerHeight - 350) + 175;

      console.log("🚀 Jarvis Patrolling to:", nextX, nextY);

      if (isMounted.current && showAgentRef.current) {
        await controls.start({
          x: nextX,
          y: nextY,
          transition: {
            duration: 12 + Math.random() * 8,
            ease: "linear",
          },
        });
      }

      if (isMounted.current && showAgentRef.current) {
        await new Promise((r) => setTimeout(r, 3000 + Math.random() * 4000));
      }
    }
  }, [controls, isPatrolling, target, isOpen, isInteracting]);

  // --- Move to Target ---
  const moveToTarget = useCallback(
    async (newTarget: TargetPosition) => {
      setTarget(newTarget);
      setIsVisible(true);
      await waitForControlsHost();
      if (!showAgentRef.current || !isMounted.current) return;

      await controls.start({
        x: newTarget.x - 100,
        y: newTarget.y - 150,
        opacity: 1,
        scale: 1,
        transition: { duration: 1.5, ease: "easeInOut" },
      });

      setTimeout(() => setTarget(null), 5000);
    },
    [controls]
  );

  // --- Listen for Visit Requests ---
  useEffect(() => {
    const handleVisit = (e: any) => {
      if (e.detail) {
        moveToTarget(e.detail as TargetPosition);
      }
    };

    window.addEventListener("jarvis:visit", handleVisit);
    return () => window.removeEventListener("jarvis:visit", handleVisit);
  }, [moveToTarget]);

  // --- Start Patrolling if Visible and no target ---
  useEffect(() => {
    if (
      showAgent &&
      !target &&
      !isPatrolling &&
      !isOpen &&
      !isInteracting
    ) {
      void startPatrol();
    }
  }, [
    showAgent,
    target,
    startPatrol,
    isPatrolling,
    isOpen,
    isInteracting,
  ]);

  if (!isVisible || isExcludedRoute) return null;

  const RADIUS = 110;

  return (
    <Portal>
      {/* Background Overlay when menu is open */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: isOpen ? "auto" : "none",
          zIndex: 999998,
        }}
        onClick={() => setIsOpen(false)}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>
      </div>

      <motion.div
        drag={!isOpen}
        dragMomentum={false}
        initial={{ x: -300, y: -300, opacity: 0 }}
        animate={controls}
        whileDrag={{ scale: 1.1, cursor: "grabbing" }}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 999999, // Super layer
          pointerEvents: "auto",
        }}
        className="group flex items-center justify-center"
      >
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="relative flex items-center justify-center"
          >
            {/* --- ORBITAL MENU --- */}
            <AnimatePresence>
              {isOpen && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Holographic Backdrop Circle */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.3, opacity: 0.2 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute w-[260px] h-[260px] rounded-full border border-cyan-400 border-dashed animate-spin-slow"
                  />

                  {MENU_ITEMS.map((item, index) => {
                    const angle = (index / MENU_ITEMS.length) * 2 * Math.PI - Math.PI / 2;
                    const x = Math.cos(angle) * RADIUS;
                    const y = Math.sin(angle) * RADIUS;

                    return (
                      <motion.button
                        key={item.id}
                        initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: -180 }}
                        animate={{ x, y, scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 180 }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 20,
                          delay: index * 0.05,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(item.href);
                          setIsOpen(false);
                        }}
                        className="absolute w-12 h-12 rounded-xl flex items-center justify-center text-white border border-white/20 hover:border-white/50 transition-colors shadow-lg group/item"
                        style={{ backgroundColor: `${item.color}22` }}
                      >
                        <div
                          className="absolute inset-0 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity blur-md"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="relative z-10" style={{ color: item.color }}>
                          {item.icon}
                        </div>

                        {/* Hover Tooltip */}
                        <div className="absolute -bottom-6 opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap text-[10px] font-bold text-white uppercase tracking-tighter bg-black/60 px-2 py-0.5 rounded-sm border border-white/10">
                          {item.label}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>

            <div
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (!isLoggedIn) {
                  // Optional: beri feedback visual jika user belum login
                  window.dispatchEvent(
                    new CustomEvent("jarvis:visit", {
                      detail: { x: e.clientX, y: e.clientY, label: "SECURE ACCESS REQUIRED" },
                    })
                  );
                  return;
                }
                setIsOpen(!isOpen);
              }}
            >
              <JarvisAgent
                size={isOpen ? 60 : 40}
                status={target ? "diagnosing" : aiMode}
                lightMode={themeMode === "light"}
                isOpen={isOpen}
              />
            </div>

            {/* Label Indicator (Hidden when open) */}
            {target?.label && !isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-cyan-400/50 px-3 py-1 rounded text-[10px] text-cyan-300 font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(34,211,238,0.3)]"
              >
                {target.label}
              </motion.div>
            )}

            {/* Floating Glow Aura */}
            {!isOpen && (
              <div className="absolute inset-0 bg-cyan-500/10 blur-3xl rounded-full -z-10 animate-pulse" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </Portal>
  );
}

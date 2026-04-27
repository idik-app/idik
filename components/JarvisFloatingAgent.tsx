"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useAI } from "@/app/contexts/AIContext";
import JarvisAgent from "./JarvisAgent";
import { useUI } from "@/contexts/UIContext";
import { useSession } from "@/contexts/SessionContext";
import Portal from "./Portal";
import { useRouter, usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  type IntensiveJarvisMenuItem,
  normalizeIntensiveMenuRow,
  intensiveMenuDisplayLabel,
  getIntensiveJarvisContextSlug,
  JARVIS_ORBIT_COLOR_CYCLE,
  IDIK_INTENSIVE_JARVIS_ORBIT_EVENT,
  IDIK_JARVIS_FLOATING_CLOSE_EVENT,
} from "@/lib/intensive/jarvisMenuModel";
import { Z_INDEX_VALUES } from "@/lib/ui/layers";

interface TargetPosition {
  x: number;
  y: number;
  label?: string;
}

type LinkOrbital = {
  kind: "link";
  id: string;
  label: string;
  fullLabel?: string;
  href: string;
  color: string;
  Icon: LucideIcon;
};

type IntensiveOrbital = {
  kind: "intensive";
  id: string;
  label: string;
  fullLabel: string;
  color: string;
  Icon: LucideIcon;
  menuItem: IntensiveJarvisMenuItem;
  roomSlug: string;
};

type OrbitalMenuEntry = LinkOrbital | IntensiveOrbital;

function resolveLucideIcon(name: string): LucideIcon {
  const I = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  return I ?? LucideIcons.HelpCircle;
}

/** Item dasar; ikon di-render lewat `Icon` agar bisa difilter. */
const BASE_ORBITAL_MENU: Omit<LinkOrbital, "kind">[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    fullLabel: "Dashboard utama",
    href: "/dashboard",
    color: "#22d3ee",
    Icon: LucideIcons.House,
  },
  {
    id: "pasien",
    label: "Pasien",
    href: "/dashboard/pasien",
    color: "#a855f7",
    Icon: LucideIcons.Users,
  },
  {
    id: "dokter",
    label: "Dokter",
    href: "/dashboard/dokter",
    color: "#eab308",
    Icon: LucideIcons.Stethoscope,
  },
  {
    id: "tindakan",
    label: "Tindakan",
    href: "/dashboard/layanan/tindakan",
    color: "#10b981",
    Icon: LucideIcons.Activity,
  },
  {
    id: "inventaris",
    label: "Inventaris",
    href: "/dashboard/inventaris",
    color: "#f43f5e",
    Icon: LucideIcons.Box,
  },
  {
    id: "database",
    label: "Database",
    href: "/system/database",
    color: "#6366f1",
    Icon: LucideIcons.Database,
  },
];

const DB_ADMIN_ROLES = new Set([
  "superadmin",
  "administrator",
  "admin",
  "it",
]);

const MAX_UNIT_SHORTCUTS = 6;

type AccessibleRoom = { slug: string; nama: string | null };

function buildOrbitalMenuForUser(
  isLoggedIn: boolean,
  rooms: AccessibleRoom[],
  role: string,
): LinkOrbital[] {
  const r = (role || "").toLowerCase().trim();
  const showDatabase = DB_ADMIN_ROLES.has(r);
  const base: LinkOrbital[] = BASE_ORBITAL_MENU.filter(
    (item) => item.id !== "database" || showDatabase,
  ).map((item) => ({ kind: "link" as const, ...item }));

  if (!isLoggedIn) return base;

  const sorted = [...rooms].sort((a, b) =>
    (a.nama || a.slug).localeCompare(b.nama || b.slug, "id", {
      sensitivity: "base",
    }),
  );

  const unitItems: LinkOrbital[] = sorted
    .slice(0, MAX_UNIT_SHORTCUTS)
    .map((u) => {
      const slug = u.slug.trim().toLowerCase();
      const name = (u.nama && u.nama.trim()) || slug;
      const label =
        name.length > 22 ? `${name.slice(0, 20).trimEnd()}…` : name;
      return {
        kind: "link" as const,
        id: `unit-${slug}`,
        label,
        fullLabel: u.nama?.trim()
          ? `Dashboard unit — ${u.nama.trim()}`
          : `Dashboard /${slug}`,
        href: `/${slug}/dashboard`,
        color: "#06b6d4",
        Icon: LucideIcons.Building2,
      };
    });

  const showGlobalOrbital = DB_ADMIN_ROLES.has(r);
  if (unitItems.length > 0 && !showGlobalOrbital) {
    return unitItems;
  }

  return [...unitItems, ...base];
}

export default function JarvisFloatingAgent() {
  const router = useRouter();
  const pathname = usePathname();
  const { mode: aiMode } = useAI();
  const { themeMode } = useUI();
  const { username, role } = useSession();
  const [accessibleRooms, setAccessibleRooms] = useState<AccessibleRoom[]>(
    [],
  );
  const [intensiveJarvisRows, setIntensiveJarvisRows] = useState<
    IntensiveJarvisMenuItem[]
  >([]);
  const [intensiveRoomNama, setIntensiveRoomNama] = useState("");
  const controls = useAnimation();
  const [target, setTarget] = useState<TargetPosition | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isPatrolling, setIsPatrolling] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const isMounted = useRef(true);
  /** Harus true agar useAnimation terhubung ke motion.div (bukan saat return null). */
  const showAgentRef = useRef(false);
  /** Patroli async tidak boleh mengandalkan closure `isOpen` — cek ref setelah await panjang. */
  const isOpenRef = useRef(isOpen);
  const isInteractingRef = useRef(isInteracting);

  useLayoutEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useLayoutEffect(() => {
    isInteractingRef.current = isInteracting;
  }, [isInteracting]);

  const isLoggedIn = username !== "unknown" && role !== "guest";

  useEffect(() => {
    if (!isLoggedIn) {
      setAccessibleRooms([]);
      return;
    }
    let cancelled = false;
    void fetch("/api/me/accessible-ruangan", { credentials: "include" })
      .then((res) => res.json())
      .then((d: { ok?: boolean; data?: AccessibleRoom[] }) => {
        if (cancelled || !d?.ok || !Array.isArray(d.data)) return;
        setAccessibleRooms(
          d.data.filter((x) => x?.slug && String(x.slug).trim().length > 0),
        );
      })
      .catch(() => {
        if (!cancelled) setAccessibleRooms([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const intensiveContextSlug = useMemo(
    () => getIntensiveJarvisContextSlug(pathname, accessibleRooms),
    [pathname, accessibleRooms],
  );

  useEffect(() => {
    if (!isLoggedIn || !intensiveContextSlug) {
      setIntensiveJarvisRows([]);
      setIntensiveRoomNama("");
      return;
    }
    let cancelled = false;
    void fetch(
      `/api/intensive/jarvis-menu?roomSlug=${encodeURIComponent(intensiveContextSlug)}`,
      { credentials: "include" },
    )
      .then((res) => res.json())
      .then(
        (json: {
          ok?: boolean;
          data?: Record<string, unknown>[];
          roomNama?: string;
        }) => {
          if (cancelled || !json?.ok || !Array.isArray(json.data)) {
            if (!cancelled) {
              setIntensiveJarvisRows([]);
              setIntensiveRoomNama("");
            }
            return;
          }
          setIntensiveRoomNama(
            typeof json.roomNama === "string" ? json.roomNama : "",
          );
          setIntensiveJarvisRows(
            json.data.map((row) => normalizeIntensiveMenuRow(row)),
          );
        },
      )
      .catch(() => {
        if (!cancelled) {
          setIntensiveJarvisRows([]);
          setIntensiveRoomNama("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, intensiveContextSlug]);

  const orbitalMenuItems: OrbitalMenuEntry[] = useMemo(() => {
    if (
      isLoggedIn &&
      intensiveContextSlug &&
      intensiveJarvisRows.length > 0
    ) {
      return intensiveJarvisRows.map((item, i) => {
        const full = intensiveMenuDisplayLabel(
          item,
          intensiveRoomNama,
          intensiveContextSlug,
        );
        const short =
          full.length > 22 ? `${full.slice(0, 20).trimEnd()}…` : full;
        const cycle = JARVIS_ORBIT_COLOR_CYCLE;
        return {
          kind: "intensive" as const,
          id: `jarvis-orbit-${item.id}`,
          label: short,
          fullLabel: full,
          color: cycle[i % cycle.length] ?? "#22d3ee",
          Icon: resolveLucideIcon(item.icon_name),
          menuItem: item,
          roomSlug: intensiveContextSlug,
        };
      });
    }
    return buildOrbitalMenuForUser(isLoggedIn, accessibleRooms, role);
  }, [
    isLoggedIn,
    intensiveContextSlug,
    intensiveJarvisRows,
    intensiveRoomNama,
    accessibleRooms,
    role,
  ]);

  const orbitRadius =
    orbitalMenuItems.length > 9 ? 130 : orbitalMenuItems.length > 6 ? 120 : 110;

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
      setIsPatrolling(false);
    }
  }, [isOpen, isInteracting, controls, showAgent]);

  const startPatrol = useCallback(async () => {
    if (isPatrolling || isOpenRef.current || isInteractingRef.current) return;
    if (!showAgentRef.current) return;
    setIsPatrolling(true);

    const waitWithPatrolAbort = async (totalMs: number) => {
      const step = 200;
      let elapsed = 0;
      while (elapsed < totalMs) {
        if (
          !isMounted.current ||
          !showAgentRef.current ||
          isOpenRef.current ||
          isInteractingRef.current
        ) {
          return false;
        }
        const chunk = Math.min(step, totalMs - elapsed);
        await new Promise((r) => setTimeout(r, chunk));
        elapsed += chunk;
      }
      return true;
    };

    // Initial wait to let user see Jarvis at center (bisa dibatalkan saat menu dibuka)
    if (!(await waitWithPatrolAbort(6000))) {
      setIsPatrolling(false);
      return;
    }

    await waitForControlsHost();

    while (true) {
      if (
        !isMounted.current ||
        !showAgentRef.current ||
        target ||
        isOpenRef.current ||
        isInteractingRef.current
      ) {
        setIsPatrolling(false);
        return;
      }

      const nextX = Math.random() * (window.innerWidth - 250) + 125;
      const nextY = Math.random() * (window.innerHeight - 350) + 175;

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

      if (
        !isMounted.current ||
        !showAgentRef.current ||
        isOpenRef.current ||
        isInteractingRef.current
      ) {
        setIsPatrolling(false);
        return;
      }

      const pauseMs = 3000 + Math.random() * 4000;
      if (!(await waitWithPatrolAbort(pauseMs))) {
        setIsPatrolling(false);
        return;
      }
    }
  }, [controls, isPatrolling, target]);

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

  /** Tutup orbital bila modal layer atas (ICCU / history) dibuka — hindari state & z-index “nyangkut”. */
  useEffect(() => {
    const onForceClose = () => {
      setIsOpen(() => false);
    };
    window.addEventListener(IDIK_JARVIS_FLOATING_CLOSE_EVENT, onForceClose);
    return () =>
      window.removeEventListener(IDIK_JARVIS_FLOATING_CLOSE_EVENT, onForceClose);
  }, []);

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

  return (
    <Portal>
      {/*
        Satu stacking context: z-index = jarvisAgent (tetap < intensive ICCU 100200).
        Wrapper `pointer-events: none` + backdrop / agen anak `auto` = agen selalu bisa diklik,
        area gelap saat menu terbuka menutup menu.
      */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: Z_INDEX_VALUES.jarvisAgent,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: isOpen ? "auto" : "none",
          }}
          onClick={() => setIsOpen(() => false)}
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
          initial={{ x: -300, y: -300, opacity: 0 }}
          animate={controls}
          onMouseEnter={() => setIsInteracting(true)}
          onMouseLeave={() => setIsInteracting(false)}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            zIndex: 1,
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

                  {orbitalMenuItems.map((entry, index) => {
                    const n = Math.max(1, orbitalMenuItems.length);
                    const angle = (index / n) * 2 * Math.PI - Math.PI / 2;
                    const x = Math.cos(angle) * orbitRadius;
                    const y = Math.sin(angle) * orbitRadius;
                    const Icon = entry.Icon;

                    return (
                      <motion.button
                        key={entry.id}
                        type="button"
                        title={
                          entry.kind === "intensive"
                            ? entry.fullLabel
                            : entry.fullLabel || entry.label
                        }
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
                          if (entry.kind === "link") {
                            router.push(entry.href);
                          } else {
                            window.dispatchEvent(
                              new CustomEvent(IDIK_INTENSIVE_JARVIS_ORBIT_EVENT, {
                                detail: {
                                  item: entry.menuItem,
                                  roomSlug: entry.roomSlug,
                                },
                              }),
                            );
                          }
                          setIsOpen(() => false);
                        }}
                        className="absolute w-12 h-12 rounded-xl flex items-center justify-center text-white border border-white/20 hover:border-white/50 transition-colors shadow-lg group/item"
                        style={{ backgroundColor: `${entry.color}22` }}
                      >
                        <div
                          className="absolute inset-0 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity blur-md"
                          style={{ backgroundColor: entry.color }}
                        />
                        <div className="relative z-10" style={{ color: entry.color }}>
                          <Icon size={20} aria-hidden />
                        </div>

                        <div className="absolute -bottom-6 opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap text-[10px] font-bold text-white uppercase tracking-tighter bg-black/60 px-2 py-0.5 rounded-sm border border-white/10 max-w-[9rem] truncate">
                          {entry.label}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>

            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 font-inherit outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                if (!isLoggedIn) {
                  window.dispatchEvent(
                    new CustomEvent("jarvis:visit", {
                      detail: { x: e.clientX, y: e.clientY, label: "SECURE ACCESS REQUIRED" },
                    })
                  );
                  return;
                }
                setIsOpen((open) => !open);
              }}
            >
              <JarvisAgent
                size={isOpen ? 60 : 40}
                status={target ? "diagnosing" : aiMode}
                lightMode={themeMode === "neo-white"}
                isOpen={isOpen}
              />
            </button>

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
      </div>
    </Portal>
  );
}

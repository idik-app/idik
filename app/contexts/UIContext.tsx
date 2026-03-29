"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { animate, useMotionValue, MotionValue } from "framer-motion";

type TransitionMode = "fast" | "smooth" | "cinematic";
type ThemeMode = "gold-cyan" | "neo-white" | "dark-clinical";

/** Zoom tampilan area konten dashboard (50–200%, langkah 5%). */
export const UI_ZOOM_MIN = 50;
export const UI_ZOOM_MAX = 200;
export const UI_ZOOM_STEP = 5;

export function clampUiZoomPercent(value: number): number {
  const stepped = Math.round(value / UI_ZOOM_STEP) * UI_ZOOM_STEP;
  return Math.min(UI_ZOOM_MAX, Math.max(UI_ZOOM_MIN, stepped));
}

interface UIContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  motionX: MotionValue<number>;
  sidebarWidth: number;
  isMobile: boolean;
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  transitionMode: TransitionMode;
  setTransitionMode: (mode: TransitionMode) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // 🔥 tambahan untuk animasi logout global
  showLogoutAnim: boolean;
  setShowLogoutAnim: React.Dispatch<React.SetStateAction<boolean>>;

  /** Persentase zoom area konten (header + isi tab), bukan sidebar. */
  uiZoomPercent: number;
  setUiZoomPercent: React.Dispatch<React.SetStateAction<number>>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);
UIContext.displayName = "UIContext";

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(true); // desktop: default icon-only, hover untuk expand
  const sidebarWidth = 288;
  const collapsedWidth = 80;
  const motionX = useMotionValue(80);
  const [isMobile, setIsMobile] = useState(false);
  /** Lebar viewport untuk membatasi drawer sidebar di HP */
  const [winW, setWinW] = useState(1024);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [transitionMode, setTransitionMode] =
    useState<TransitionMode>("smooth");
  const [themeMode, setThemeMode] = useState<ThemeMode>("gold-cyan");

  // 🧩 state logout global
  const [showLogoutAnim, setShowLogoutAnim] = useState(false);

  const [uiZoomPercent, setUiZoomPercentRaw] = useState(100);
  const setUiZoomPercent = useCallback(
    (action: React.SetStateAction<number>) => {
      setUiZoomPercentRaw((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        return clampUiZoomPercent(next);
      });
    },
    [],
  );

  // Responsif otomatis
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setWinW(w);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // HP: mulai dengan drawer tertutup agar konten utama terlihat (bukan layar penuh menu)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Persist & load preferensi
  useEffect(() => {
    const savedTheme = localStorage.getItem("idik_theme");
    const savedTrans = localStorage.getItem("idik_transition");
    const savedZoom = localStorage.getItem("idik_ui_zoom");
    if (savedTheme) setThemeMode(savedTheme as ThemeMode);
    if (savedTrans) setTransitionMode(savedTrans as TransitionMode);
    if (savedZoom) {
      const z = parseInt(savedZoom, 10);
      if (!Number.isNaN(z)) setUiZoomPercentRaw(clampUiZoomPercent(z));
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("idik_theme", themeMode);
    localStorage.setItem("idik_transition", transitionMode);
    localStorage.setItem("idik_ui_zoom", String(uiZoomPercent));
  }, [themeMode, transitionMode, uiZoomPercent]);

  // Sinkronisasi motionX — desktop: collapsed 80px / expanded 288px; HP: terbuka = drawer lebar (bukan 80px)
  useEffect(() => {
    const from = motionX.get();
    let to: number;
    if (!isSidebarOpen) {
      to = isMobile ? 0 : collapsedWidth;
    } else if (isMobile) {
      const maxDrawer = Math.max(220, Math.min(sidebarWidth, winW - 16));
      to = maxDrawer;
    } else {
      to = collapsed ? collapsedWidth : sidebarWidth;
    }

    const controls = animate(from, to, {
      duration:
        transitionMode === "fast"
          ? 0.4
          : transitionMode === "smooth"
          ? 0.55
          : 0.8,
      ease: [0.4, 0, 0.2, 1],
      onUpdate: (v) => motionX.set(v),
    });

    return () => controls.stop();
  }, [isSidebarOpen, collapsed, motionX, transitionMode, isMobile, winW, sidebarWidth]);

  // Toggle functions (memoized)
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((p) => !p);
    navigator.vibrate?.([10, 25]);
  }, []);
  const toggleSettings = useCallback(() => setSettingsOpen((p) => !p), []);

  const value = useMemo(
    () => ({
      isSidebarOpen,
      toggleSidebar,
      collapsed,
      setCollapsed,
      motionX,
      sidebarWidth,
      isMobile,
      isSettingsOpen,
      toggleSettings,
      transitionMode,
      setTransitionMode,
      themeMode,
      setThemeMode,
      showLogoutAnim,
      setShowLogoutAnim,
      uiZoomPercent,
      setUiZoomPercent,
    }),
    [
      isSidebarOpen,
      collapsed,
      motionX,
      isMobile,
      isSettingsOpen,
      transitionMode,
      themeMode,
      showLogoutAnim,
      uiZoomPercent,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within a UIProvider");
  return ctx;
};

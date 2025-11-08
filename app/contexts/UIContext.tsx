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
}

const UIContext = createContext<UIContextType | undefined>(undefined);
UIContext.displayName = "UIContext";

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = 288;
  const collapsedWidth = 80;
  const motionX = useMotionValue(sidebarWidth);
  const [isMobile, setIsMobile] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [transitionMode, setTransitionMode] =
    useState<TransitionMode>("smooth");
  const [themeMode, setThemeMode] = useState<ThemeMode>("gold-cyan");

  // 🧩 state logout global
  const [showLogoutAnim, setShowLogoutAnim] = useState(false);

  // Responsif otomatis
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Persist & load preferensi
  useEffect(() => {
    const savedTheme = localStorage.getItem("idik_theme");
    const savedTrans = localStorage.getItem("idik_transition");
    if (savedTheme) setThemeMode(savedTheme as ThemeMode);
    if (savedTrans) setTransitionMode(savedTrans as TransitionMode);
  }, []);
  useEffect(() => {
    localStorage.setItem("idik_theme", themeMode);
    localStorage.setItem("idik_transition", transitionMode);
  }, [themeMode, transitionMode]);

  // Sinkronisasi animasi motionX
  useEffect(() => {
    const from = motionX.get();
    const to = isSidebarOpen
      ? collapsed
        ? collapsedWidth
        : sidebarWidth
      : collapsedWidth;

    const controls = animate(from, to, {
      duration:
        transitionMode === "fast"
          ? 0.3
          : transitionMode === "smooth"
          ? 0.5
          : 0.75,
      ease: [0.33, 1, 0.68, 1],
      onUpdate: (v) => motionX.set(v),
    });

    return () => controls.stop();
  }, [isSidebarOpen, collapsed, motionX, transitionMode]);

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
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within a UIProvider");
  return ctx;
};

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import JarvisModeOverlay from "@/components/jarvis-mode/JarvisModeOverlay";
import { useJarvisModeIdle } from "@/hooks/useJarvisModeIdle";
import {
  JARVIS_MODE_DEFAULTS,
  type JarvisModeConfig,
  type JarvisModeData,
} from "@/lib/jarvis-mode/types";

type JarvisModeContextValue = {
  isActive: boolean;
  data: JarvisModeData;
  setData: (next: JarvisModeData) => void;
  enter: () => void;
  exit: () => void;
  autoSleepRemainingMs: number;
  autoSleepMs: number;
  locationLabel: string;
};

const JarvisModeContext = createContext<JarvisModeContextValue | null>(null);

export function JarvisModeProvider({
  children,
  config,
}: {
  children: ReactNode;
  config?: JarvisModeConfig;
}) {
  const idleEnterMs = config?.idleEnterMs ?? JARVIS_MODE_DEFAULTS.idleEnterMs;
  const autoSleepMs = config?.autoSleepMs ?? JARVIS_MODE_DEFAULTS.autoSleepMs;
  const locationLabel =
    config?.locationLabel ?? JARVIS_MODE_DEFAULTS.locationLabel;

  const [data, setDataState] = useState<JarvisModeData>({
    stats: {},
    loading: true,
  });

  const setData = useCallback((next: JarvisModeData) => {
    setDataState((prev) => ({
      ...prev,
      ...next,
      lastSyncAt: next.lastSyncAt ?? new Date().toLocaleTimeString("id-ID"),
    }));
  }, []);

  const idle = useJarvisModeIdle({ idleEnterMs, autoSleepMs, enabled: true });

  const value = useMemo<JarvisModeContextValue>(
    () => ({
      isActive: idle.isActive,
      data,
      setData,
      enter: idle.enter,
      exit: idle.exit,
      autoSleepRemainingMs: idle.autoSleepRemainingMs,
      autoSleepMs,
      locationLabel,
    }),
    [
      idle.isActive,
      idle.enter,
      idle.exit,
      idle.autoSleepRemainingMs,
      data,
      setData,
      autoSleepMs,
      locationLabel,
    ],
  );

  return (
    <JarvisModeContext.Provider value={value}>
      {children}
      <JarvisModeOverlay />
    </JarvisModeContext.Provider>
  );
}

export function useJarvisMode(): JarvisModeContextValue {
  const ctx = useContext(JarvisModeContext);
  if (!ctx) {
    throw new Error("useJarvisMode must be used within JarvisModeProvider");
  }
  return ctx;
}

/** Opsional — untuk komponen di luar provider (no-op). */
export function useJarvisModeOptional(): JarvisModeContextValue | null {
  return useContext(JarvisModeContext);
}

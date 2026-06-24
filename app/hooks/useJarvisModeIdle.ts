"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { JARVIS_MODE_DEFAULTS } from "@/lib/jarvis-mode/types";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "click",
  "touchstart",
  "scroll",
] as const;

export type JarvisModeIdleState = {
  isActive: boolean;
  idleMs: number;
  autoSleepRemainingMs: number;
  enter: () => void;
  exit: () => void;
  resetActivity: () => void;
};

type Options = {
  idleEnterMs?: number;
  autoSleepMs?: number;
  enabled?: boolean;
};

/**
 * Deteksi idle pengguna: setelah `idleEnterMs` (default 60 menit) tanpa input → JARVIS Mode aktif.
 * Saat aktif, `autoSleepMs` countdown; interaksi apa pun mereset countdown.
 */
export function useJarvisModeIdle(options: Options = {}): JarvisModeIdleState {
  const idleEnterMs = options.idleEnterMs ?? JARVIS_MODE_DEFAULTS.idleEnterMs;
  const autoSleepMs = options.autoSleepMs ?? JARVIS_MODE_DEFAULTS.autoSleepMs;
  const enabled = options.enabled ?? true;

  const [isActive, setIsActive] = useState(false);
  const [idleMs, setIdleMs] = useState(0);
  const [autoSleepRemainingMs, setAutoSleepRemainingMs] =
    useState(autoSleepMs);

  const lastActivityRef = useRef(Date.now());
  const isActiveRef = useRef(false);
  const autoSleepDeadlineRef = useRef<number | null>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleMs(0);
    if (isActiveRef.current) {
      autoSleepDeadlineRef.current = Date.now() + autoSleepMs;
      setAutoSleepRemainingMs(autoSleepMs);
    }
  }, [autoSleepMs]);

  const enter = useCallback(() => {
    isActiveRef.current = true;
    setIsActive(true);
    autoSleepDeadlineRef.current = Date.now() + autoSleepMs;
    setAutoSleepRemainingMs(autoSleepMs);
    lastActivityRef.current = Date.now();
    setIdleMs(0);
  }, [autoSleepMs]);

  const exit = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    autoSleepDeadlineRef.current = null;
    setAutoSleepRemainingMs(autoSleepMs);
    lastActivityRef.current = Date.now();
    setIdleMs(0);
  }, [autoSleepMs]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const onActivity = () => resetActivity();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }

    const tick = window.setInterval(() => {
      const now = Date.now();
      const inactive = now - lastActivityRef.current;
      setIdleMs(inactive);

      if (!isActiveRef.current && inactive >= idleEnterMs) {
        enter();
        return;
      }

      if (isActiveRef.current && autoSleepDeadlineRef.current != null) {
        const remaining = Math.max(0, autoSleepDeadlineRef.current - now);
        setAutoSleepRemainingMs(remaining);
        if (remaining <= 0) {
          exit();
        }
      }
    }, 250);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
      clearInterval(tick);
    };
  }, [enabled, idleEnterMs, enter, exit, resetActivity]);

  return {
    isActive,
    idleMs,
    autoSleepRemainingMs,
    enter,
    exit,
    resetActivity,
  };
}

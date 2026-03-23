"use client";
import React, { createContext, useState, useContext, useCallback } from "react";

interface HudEvent {
  id: string;
  time: string;
  module: string;
  type: string;
  message: string;
  level?: "info" | "warning" | "error" | "success";
}

interface DiagnosticsHUDState {
  events: HudEvent[];
  addEvent: (e: Omit<HudEvent, "id" | "time">) => void;
  clearEvents: () => void;
}

const DiagnosticsHUDContext = createContext<DiagnosticsHUDState | null>(null);

export function DiagnosticsHUDProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [events, setEvents] = useState<HudEvent[]>([]);

  const addEvent = useCallback((e: Omit<HudEvent, "id" | "time">) => {
    const event = {
      ...e,
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString(),
    };
    setEvents((prev) => [event, ...prev].slice(0, 50)); // simpan 50 event terakhir
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);

  return (
    <DiagnosticsHUDContext.Provider value={{ events, addEvent, clearEvents }}>
      {children}
    </DiagnosticsHUDContext.Provider>
  );
}

export function useDiagnosticsHUD() {
  const ctx = useContext(DiagnosticsHUDContext);
  if (!ctx)
    throw new Error(
      "useDiagnosticsHUD harus dipakai di dalam DiagnosticsHUDProvider"
    );
  return ctx;
}

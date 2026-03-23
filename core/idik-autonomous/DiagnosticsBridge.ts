"use client";

import { create } from "zustand";

/**
 * DiagnosticsBridge v3.7
 * Menjadi jembatan global untuk DiagnosticsHUD:
 * - status koneksi Supabase
 * - jumlah realtime events
 * - last update timestamp
 */

type DiagnosticsState = {
  supabaseStatus: "connected" | "disconnected" | "idle";
  realtimeEvents: number;
  lastUpdate: number | null;

  setSupabaseStatus: (v: DiagnosticsState["supabaseStatus"]) => void;
  incrementEvents: () => void;
  markUpdated: () => void;
};

export const useDiagnosticsBridge = create<DiagnosticsState>((set) => ({
  supabaseStatus: "idle",
  realtimeEvents: 0,
  lastUpdate: null,

  setSupabaseStatus: (v) => set({ supabaseStatus: v }),
  incrementEvents: () =>
    set((state) => ({ realtimeEvents: state.realtimeEvents + 1 })),
  markUpdated: () => set({ lastUpdate: Date.now() }),
}));

export const DiagnosticsBridge = {
  start() {
    useDiagnosticsBridge.getState().markUpdated();
  },

  stop() {
    useDiagnosticsBridge.getState().setSupabaseStatus("idle");
  },

  connected() {
    useDiagnosticsBridge.getState().setSupabaseStatus("connected");
    useDiagnosticsBridge.getState().markUpdated();
  },

  disconnected() {
    useDiagnosticsBridge.getState().setSupabaseStatus("disconnected");
    useDiagnosticsBridge.getState().markUpdated();
  },

  eventReceived() {
    useDiagnosticsBridge.getState().incrementEvents();
    useDiagnosticsBridge.getState().markUpdated();
  },
};

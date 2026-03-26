"use client";

/**
 * AutonomousSupervisor v3.8
 * Mengelola integrasi otomatis:
 * - health check berkala ke Supabase (ping)
 * - update DiagnosticsBridge (connected/disconnected)
 * - retry saat putus
 */

import { DiagnosticsBridge } from "./DiagnosticsBridge";

const HEALTH_CHECK_INTERVAL_MS = 15_000;
const PING_TABLE = "pasien";

export class AutonomousSupervisor {
  private static instance: AutonomousSupervisor | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  private supabase: any | null = null;

  static init() {
    if (!AutonomousSupervisor.instance) {
      AutonomousSupervisor.instance = new AutonomousSupervisor();
    }
    return AutonomousSupervisor.instance;
  }

  constructor() {
    void this.ensureSupabase().then(() => {
      void this.runHealthCheck();
      this.healthCheckTimer = setInterval(
        () => void this.runHealthCheck(),
        HEALTH_CHECK_INTERVAL_MS,
      );
    });
  }

  /** Stop health check (e.g. on teardown) */
  stop() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    DiagnosticsBridge.stop();
  }

  /** Satu kali ping ke Supabase; update Bridge */
  private async runHealthCheck() {
    try {
      const sb = await this.ensureSupabase();
      const { error } = await this.supabase
        .from(PING_TABLE)
        .select("id")
        .limit(1)
        .maybeSingle();
      if (error) {
        DiagnosticsBridge.disconnected();
      } else {
        DiagnosticsBridge.connected();
      }
    } catch {
      DiagnosticsBridge.disconnected();
    }
  }

  /** Register listener realtime */
  registerRealtime(channel: string, table: string) {
    const p = this.ensureSupabase();
    // Return a promise-like object: callers can await if needed, but legacy code can ignore.
    return p.then((sb) =>
      sb
        .channel(channel)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
          DiagnosticsBridge.eventReceived();
        })
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") DiagnosticsBridge.connected();
          else DiagnosticsBridge.disconnected();
        }),
    );
  }

  private async ensureSupabase() {
    if (this.supabase) return this.supabase;
    const mod = await import("@/lib/supabase/supabaseClient");
    this.supabase = mod.supabase as any;
    return this.supabase;
  }
}

"use client";

/**
 * AutonomousSupervisor v3.8
 * Mengelola integrasi otomatis:
 * - health check berkala ke Supabase (ping)
 * - update DiagnosticsBridge (connected/disconnected)
 * - retry saat putus
 */

import { DiagnosticsBridge } from "./DiagnosticsBridge";
import { supabase } from "@/lib/supabase/supabaseClient";

const HEALTH_CHECK_INTERVAL_MS = 15_000;
const PING_TABLE = "pasien";

export class AutonomousSupervisor {
  private static instance: AutonomousSupervisor | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  supabase = supabase;

  static init() {
    if (!AutonomousSupervisor.instance) {
      AutonomousSupervisor.instance = new AutonomousSupervisor();
    }
    return AutonomousSupervisor.instance;
  }

  constructor() {
    this.runHealthCheck();
    this.healthCheckTimer = setInterval(
      () => this.runHealthCheck(),
      HEALTH_CHECK_INTERVAL_MS
    );
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
    return this.supabase
      .channel(channel)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        DiagnosticsBridge.eventReceived();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") DiagnosticsBridge.connected();
        else DiagnosticsBridge.disconnected();
      });
  }
}

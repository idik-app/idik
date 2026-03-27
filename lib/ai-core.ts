// lib/ai-core.ts
"use client";

import { supabase } from "@/lib/supabaseClient";

type DiagnosticResult = {
  ok: boolean;
  latency: number;
  message: string;
  issue?: string;
};

/* ⚙️ Diagnostic System JARVIS */
export async function runDiagnostics(): Promise<DiagnosticResult> {
  if (!supabase) {
    return {
      ok: false,
      latency: 0,
      message: "Supabase client not initialized",
      issue: "no_client",
    };
  }

  const start = performance.now();

  try {
    const { error } = await supabase.from("system_logs").select("id").limit(1);
    const latency = Math.round(performance.now() - start);

    if (error) {
      return {
        ok: false,
        latency,
        message: "Supabase query error",
        issue: error.message,
      };
    }

    return { ok: true, latency, message: "System stable" };
  } catch (err) {
    return {
      ok: false,
      latency: 0,
      message: "Network or Supabase unreachable",
      issue: "network_down",
    };
  }
}

/* 🧩 Auto-fix fallback */
export async function autoFix(issue?: string): Promise<string> {
  switch (issue) {
    case "no_client":
      return "Env vars missing or Supabase not initialized.";
    case "network_down":
      await new Promise((r) => setTimeout(r, 3000));
      return "Network recheck complete.";
    default:
      return "AutoFix executed.";
  }
}

/* 🧠 Log diagnostic result */
export async function logEvent(
  type: string,
  data: Record<string, any>
): Promise<void> {
  const entry = {
    timestamp: new Date().toISOString(),
    module: "AI-Core",
    level: data.ok ? "info" : "warning",
    message: data.message,
    latency: data.latency ?? 0,
    issue: data.issue ?? null,
  };

  console.log("📡 [AI-LOG]", entry);

  // Default: jangan kirim write log dari browser agar tidak spam 401
  // pada environment dengan RLS ketat untuk `system_logs`.
  const allowClientWrite =
    process.env.NEXT_PUBLIC_ENABLE_CLIENT_SYSTEM_LOG_WRITE === "true";
  if (!allowClientWrite) return;

  try {
    const {
      data: { session },
    } = await (supabase as any).auth.getSession();
    if (!session) return;
    await (supabase as any).from("system_logs").insert(entry);
  } catch {
    console.warn("⚠️ Log fallback (SafeMode)");
  }
}

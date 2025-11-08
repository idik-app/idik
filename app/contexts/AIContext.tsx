// app/contexts/AIContext.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { logEvent, runDiagnostics, autoFix } from "@/lib/ai-core";

type AIState = {
  mode: "idle" | "learning" | "diagnosing" | "repairing";
  lastInsight: string;
  latency: number;
};

const AIContext = createContext<AIState | undefined>(undefined);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AIState>({
    mode: "idle",
    lastInsight: "System stable.",
    latency: 0,
  });

  useEffect(() => {
    const check = async () => {
      const result = await runDiagnostics();
      if (!result.ok) await autoFix(result.issue);
      setState({
        mode: result.ok ? "idle" : "repairing",
        lastInsight: result.message,
        latency: result.latency,
      });
      logEvent("ai_diagnostic", result);
    };
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  return <AIContext.Provider value={state}>{children}</AIContext.Provider>;
}

export const useAI = () => useContext(AIContext)!;

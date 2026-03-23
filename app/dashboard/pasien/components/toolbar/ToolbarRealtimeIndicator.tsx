"use client";
import { useEffect, useState } from "react";

export function ToolbarRealtimeIndicator() {
  const [status, setStatus] = useState<"live" | "delay" | "offline">("live");
  const [lastSync, setLastSync] = useState<string>("—");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLastSync(
        now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      );
      const ping = Math.random(); // simulasi status
      if (ping > 0.7) setStatus("offline");
      else if (ping > 0.4) setStatus("delay");
      else setStatus("live");
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const color =
    status === "live"
      ? "text-green-400"
      : status === "delay"
      ? "text-yellow-400"
      : "text-red-500";

  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className={color}>●</span>
      <span className="text-cyan-300">Realtime</span>
      <span className="text-gray-400">({lastSync})</span>
    </div>
  );
}

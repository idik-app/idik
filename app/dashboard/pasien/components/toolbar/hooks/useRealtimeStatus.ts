"use client";
import { useEffect, useState } from "react";

export function useRealtimeStatus() {
  const [status, setStatus] = useState<"live" | "delay" | "offline">("live");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [events, setEvents] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastSync(new Date());
      const rnd = Math.random();
      setStatus(rnd > 0.7 ? "offline" : rnd > 0.4 ? "delay" : "live");
      setEvents((e) => e + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return { status, lastSync, events };
}

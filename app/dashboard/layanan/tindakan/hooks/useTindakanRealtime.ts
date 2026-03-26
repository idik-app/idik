// Minimal realtime hook for tindakan module.
"use client";

import { useEffect, useRef, useState } from "react";
import { DiagnosticsBridge } from "@/core/idik-autonomous/DiagnosticsBridge";

function isPublicSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function useTindakanRealtime() {
  const [eventCount, setEventCount] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    if (!isPublicSupabaseConfigured()) return;

    let cancelled = false;
    let channel: unknown = null;
    let removeChannel: ((c: unknown) => unknown) | null = null;

    void (async () => {
      try {
        const mod = await import("@/lib/supabase/supabaseClient");
        if (cancelled) return;
        const sb: any = mod.supabase as any;
        removeChannel = (c: unknown) => sb.removeChannel(c as any);
        channel = sb
          .channel("realtime-tindakan")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "tindakan" },
            () => {
              DiagnosticsBridge.eventReceived();
              setEventCount((c) => c + 1);
            },
          )
          .subscribe();
      } catch {
        /* ignore realtime */
      }
    })();

    return () => {
      cancelled = true;
      try {
        if (channel && removeChannel) void removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }, []);

  return { eventCount };
}

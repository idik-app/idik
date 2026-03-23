// Minimal realtime hook for tindakan module.
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { DiagnosticsBridge } from "@/core/idik-autonomous/DiagnosticsBridge";

export function useTindakanRealtime() {
  const [eventCount, setEventCount] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const channel = supabase
      .channel("realtime-tindakan")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tindakan" },
        () => {
          DiagnosticsBridge.eventReceived();
          setEventCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { eventCount };
}

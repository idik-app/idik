"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useNotification } from "@/app/contexts/NotificationContext";
import { DiagnosticsBridge } from "@/core/idik-autonomous/DiagnosticsBridge";

type Tindakan = any;

/**
 * ⚡ useTindakanRealtime v3.3
 * Sinkronisasi realtime otomatis tabel tindakan.
 */
export function useTindakanRealtime() {
  const { show } = useNotification();

  const [tindakanList, setTindakanList] = useState<Tindakan[]>([]);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const channelRef = useRef<any>(null);

  const refreshStats = useCallback(async () => {
    const { data, error } = await supabase
      .from("tindakan")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setTindakanList(data);
  }, []);

  const startRealtime = useCallback(() => {
    if (channelRef.current) return;
    channelRef.current = supabase
      .channel("realtime:tindakan")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tindakan" },
        (payload) => {
          DiagnosticsBridge.eventReceived();
          const event = payload.eventType;
          setLastEvent(event);
          setEventCount((c) => c + 1);

          if (event === "INSERT" && payload.new)
            setTindakanList((p) => [payload.new as Tindakan, ...p]);
          if (event === "UPDATE" && payload.new)
            setTindakanList((p) =>
              p.map((i) =>
                i.id === payload.new.id ? (payload.new as Tindakan) : i
              )
            );
          if (event === "DELETE" && payload.old)
            setTindakanList((p) => p.filter((i) => i.id !== payload.old.id));

          show({ type: "info", message: `Realtime: ${event}` });
        }
      )
      .subscribe();
  }, [show]);

  const stopRealtime = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    refreshStats();
    startRealtime();
    return stopRealtime;
  }, [refreshStats, startRealtime, stopRealtime]);

  return { tindakanList, lastEvent, eventCount, refreshStats };
}

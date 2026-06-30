"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { DiagnosticsBridge } from "@/core/idik-autonomous/DiagnosticsBridge";

type Tindakan = any;

/**
 * ⚡ useTindakanRealtime v3.4 — egress-safe
 * Hanya subscribe perubahan; tidak fetch seluruh tabel `tindakan` di mount.
 */
export function useTindakanRealtime() {
  const [tindakanList, setTindakanList] = useState<Tindakan[]>([]);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

          if (event === "INSERT" && payload.new) {
            setTindakanList((p) => [payload.new as Tindakan, ...p]);
          }
          if (event === "UPDATE" && payload.new) {
            setTindakanList((p) =>
              p.map((i) =>
                i.id === payload.new.id ? (payload.new as Tindakan) : i,
              ),
            );
          }
          if (event === "DELETE" && payload.old) {
            setTindakanList((p) => p.filter((i) => i.id !== payload.old.id));
          }
        },
      )
      .subscribe();
  }, []);

  const stopRealtime = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    startRealtime();
    return stopRealtime;
  }, [startRealtime, stopRealtime]);

  /** Manual refresh jika modul legacy masih memanggil refreshStats. */
  const refreshStats = useCallback(async () => {
  }, []);

  return { tindakanList, lastEvent, eventCount, refreshStats };
}

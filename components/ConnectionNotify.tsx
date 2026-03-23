"use client";

import { useRef, useEffect } from "react";
import { useDiagnosticsBridge } from "@/core/idik-autonomous/DiagnosticsBridge";
import { useNotification } from "@/app/contexts/NotificationContext";
import { JARVIS } from "@/lib/copy/jarvis";

type Status = "connected" | "disconnected" | "idle";

/**
 * Mendengarkan status koneksi dari DiagnosticsBridge dan menampilkan
 * notifikasi saat beralih ke disconnected atau connected.
 */
export default function ConnectionNotify() {
  const { supabaseStatus } = useDiagnosticsBridge();
  const show = useNotification().show;
  const prev = useRef<Status>("idle");

  useEffect(() => {
    const prevStatus = prev.current;
    prev.current = supabaseStatus;

    if (prevStatus === "idle" && supabaseStatus !== "idle") {
      // First real status — no toast
      return;
    }
    if (supabaseStatus === "disconnected" && prevStatus === "connected") {
      show({
        type: "warning",
        message: JARVIS.error.connectionLost,
        duration: 5000,
      });
    }
    if (supabaseStatus === "connected" && prevStatus === "disconnected") {
      show({
        type: "success",
        message: "Koneksi pulih. Semua sistem sinkron.",
        duration: 3000,
      });
    }
  }, [supabaseStatus, show]);

  return null;
}

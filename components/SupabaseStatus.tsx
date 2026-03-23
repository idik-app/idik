"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  isSupabaseConfigured,
} from "@/lib/supabase/supabaseClient";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Loader2, Settings } from "lucide-react";

export default function SupabaseStatus() {
  const configured = isSupabaseConfigured();
  const [status, setStatus] = useState<
    "CONNECTED" | "RECONNECTING" | "DISCONNECTED" | "NOT_CONFIGURED"
  >(configured ? "DISCONNECTED" : "NOT_CONFIGURED");
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const socket = (supabase as any).realtime?.connection?.socket;

    if (socket) {
      const handleOpen = () => setStatus("CONNECTED");
      const handleClose = () => setStatus("DISCONNECTED");
      const handleError = () => setStatus("RECONNECTING");

      socket.addEventListener("open", handleOpen);
      socket.addEventListener("close", handleClose);
      socket.addEventListener("error", handleError);

      if (socket.readyState === WebSocket.OPEN) setStatus("CONNECTED");

      return () => {
        socket.removeEventListener("open", handleOpen);
        socket.removeEventListener("close", handleClose);
        socket.removeEventListener("error", handleError);
      };
    }
  }, [configured]);

  // 🕒 Fallback ping (setiap 30 detik)
  useEffect(() => {
    if (!configured) return;
    const pingCheck = async () => {
      try {
        await supabase.from("ping").select("*", { head: true, count: "exact" });
        setStatus((prev) => (prev === "DISCONNECTED" ? "CONNECTED" : prev));
      } catch {
        setStatus("DISCONNECTED");
      }
    };
    pingCheck();
    const interval = setInterval(pingCheck, 30000);
    return () => clearInterval(interval);
  }, [configured]);

  const color =
    status === "CONNECTED"
      ? "text-cyan-400"
      : status === "RECONNECTING"
      ? "text-amber-400 animate-pulse"
      : status === "NOT_CONFIGURED"
      ? "text-gray-500"
      : "text-red-500";

  const icon =
    status === "CONNECTED" ? (
      <Wifi className="w-4 h-4 drop-shadow-[0_0_6px_#00ffff]" />
    ) : status === "RECONNECTING" ? (
      <Loader2 className="w-4 h-4 animate-spin text-amber-400 drop-shadow-[0_0_6px_#f4b400]" />
    ) : status === "NOT_CONFIGURED" ? (
      <Settings className="w-4 h-4 text-gray-500" />
    ) : (
      <WifiOff className="w-4 h-4 text-red-500 drop-shadow-[0_0_6px_#ff4b4b]" />
    );

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <motion.div
        className={`flex items-center ${color}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {icon}
      </motion.div>

      {showTip && (
        <div className="absolute bottom-full mb-1 px-2 py-1 text-[10px] text-gray-100 bg-black/80 rounded-md whitespace-nowrap shadow-lg">
          Supabase:{" "}
          {status === "NOT_CONFIGURED"
            ? "not configured (.env.local)"
            : status}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SupabaseStatus() {
  const [status, setStatus] = useState<
    "CONNECTED" | "RECONNECTING" | "DISCONNECTED"
  >("DISCONNECTED");
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
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
  }, []);

  // 🕒 Fallback ping (setiap 30 detik)
  useEffect(() => {
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
  }, []);

  const color =
    status === "CONNECTED"
      ? "text-cyan-400"
      : status === "RECONNECTING"
      ? "text-amber-400 animate-pulse"
      : "text-red-500";

  const icon =
    status === "CONNECTED" ? (
      <Wifi className="w-4 h-4 drop-shadow-[0_0_6px_#00ffff]" />
    ) : status === "RECONNECTING" ? (
      <Loader2 className="w-4 h-4 animate-spin text-amber-400 drop-shadow-[0_0_6px_#f4b400]" />
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
          Supabase: {status}
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface DiagnosticsHUDProps {
  module: string;
}

export default function DiagnosticsHUD({ module }: DiagnosticsHUDProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [events, setEvents] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>("–");

  // Deteksi status koneksi browser
  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  // Listener global untuk realtime event dari context
  useEffect(() => {
    const handler = () => {
      setEvents((e) => e + 1);
      setLastUpdate(new Date().toLocaleTimeString());
    };
    window.addEventListener("jarvis-realtime", handler);
    return () => window.removeEventListener("jarvis-realtime", handler);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 0.9, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl backdrop-blur-md
                 bg-gradient-to-r from-cyan-900/60 via-gray-900/70 to-black/60
                 border border-cyan-400/50 text-cyan-300 text-xs shadow-[0_0_15px_rgba(0,255,255,0.3)]"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-yellow-400">{module}</span>
        <span
          className={`ml-2 w-2.5 h-2.5 rounded-full ${
            isOnline
              ? "bg-green-400 shadow-[0_0_6px_#22c55e]"
              : "bg-red-500 shadow-[0_0_6px_#ef4444]"
          }`}
        />
      </div>
      <div className="flex justify-between">
        <span>Events:</span>
        <span>{events}</span>
      </div>
      <div className="flex justify-between">
        <span>Last update:</span>
        <span>{lastUpdate}</span>
      </div>
    </motion.div>
  );
}

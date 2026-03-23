"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function DiagnosticsHUD() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString("id-ID"));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-700/50 bg-black/70 backdrop-blur-md px-5 py-3 text-xs font-mono text-cyan-300 shadow-lg shadow-cyan-900/30"
    >
      <div>🧠 SUPABASE CONNECTED</div>
      <div>🔁 Events: 0 | Updated: {time}</div>
    </motion.div>
  );
}

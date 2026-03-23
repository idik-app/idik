"use client";
import { useDatabase } from "@/app/contexts/DatabaseContext";
import { motion } from "framer-motion";

export function DiagnosticsHUD() {
  const { status, latency } = useDatabase();
  return (
    <motion.div
      className="fixed bottom-4 right-4 bg-black/60 border border-cyan-600/50 text-cyan-200 rounded-xl px-4 py-2 text-xs shadow-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div>SUPABASE: {status === "ok" ? "🟢 OK" : "🔴 ERR"}</div>
      <div>Latency: {latency} ms</div>
    </motion.div>
  );
}

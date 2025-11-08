"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Database,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Terminal,
} from "lucide-react";
import { supabase } from "@/lib/ai-core";

/* ⚙️ Cathlab JARVIS AnalyticsHub v3.7.1
   📊 Real-time system log visualizer
   🔹 Menampilkan log dari Supabase: system_logs
   🔹 Streaming realtime via Supabase channel
   🔹 Animasi hologram cyan-gold futuristik
*/

type LogItem = {
  id: number;
  timestamp: string;
  module: string;
  level: string;
  message: string;
  latency?: number;
  issue?: string | null;
  action?: string | null;
};

export default function AnalyticsHub() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔌 Ambil log awal + streaming realtime
  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(25);
      if (error) console.warn("⚠️ Fetch log error:", error.message);
      else setLogs(data || []);
      setLoading(false);
    };

    fetchLogs();

    // ♻️ Real-time subscription
    const channel = supabase
      .channel("logs-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_logs" },
        (payload) => {
          setLogs((prev) => [payload.new as LogItem, ...prev.slice(0, 24)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-cyan-400 animate-pulse">
        🧠 Loading Analytics Hub...
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 rounded-2xl bg-gradient-to-b from-[#0a0f18]/90 via-[#0d1c28]/80 to-[#0c1825]/90
                 border border-cyan-500/20 shadow-[0_0_35px_rgba(0,255,255,0.15)]
                 backdrop-blur-xl text-cyan-100 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Activity
          size={26}
          className="text-yellow-400 drop-shadow-[0_0_6px_#FFD700]"
        />
        <h2 className="text-xl font-bold tracking-widest text-cyan-300">
          JARVIS ANALYTICS HUB
        </h2>
      </div>

      {/* Log Timeline */}
      <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-2 hide-scrollbar">
        {logs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={`relative p-4 rounded-xl border ${
              log.level === "info"
                ? "border-cyan-500/30 bg-cyan-500/5"
                : "border-yellow-400/30 bg-yellow-400/5"
            } shadow-[0_0_12px_rgba(0,255,255,0.05)]`}
          >
            <div className="flex items-center gap-2 mb-2">
              <LogIcon level={log.level} />
              <h3 className="font-semibold text-sm tracking-wide text-cyan-300">
                {log.module}
              </h3>
              <span className="text-[11px] text-gray-400 ml-auto">
                {new Date(log.timestamp).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
            <p className="text-sm text-cyan-100">{log.message}</p>

            {/* Detail bawah */}
            <div className="flex gap-3 text-xs mt-2 text-gray-400">
              {log.latency && <span>⏱ {log.latency} ms</span>}
              {log.issue && <span>⚠️ {log.issue}</span>}
              {log.action && <span>🛠 {log.action}</span>}
            </div>
          </motion.div>
        ))}

        {logs.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            Tidak ada log sistem terbaru.
          </div>
        )}
      </div>

      {/* Decorative background glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            "radial-gradient(circle at 30% 40%, rgba(0,255,255,0.05), transparent 70%)",
            "radial-gradient(circle at 80% 60%, rgba(255,215,0,0.06), transparent 70%)",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </motion.div>
  );
}

/* 🧠 Ikon sesuai level log */
function LogIcon({ level }: { level: string }) {
  switch (level) {
    case "info":
      return <CheckCircle2 size={14} className="text-green-400" />;
    case "warning":
      return <AlertTriangle size={14} className="text-yellow-400" />;
    case "error":
      return <Terminal size={14} className="text-red-400" />;
    default:
      return <Cpu size={14} className="text-cyan-400" />;
  }
}

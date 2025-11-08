"use client";

import { motion } from "framer-motion";
import {
  Cpu,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Timer,
  Database,
} from "lucide-react";
import { useAI } from "@app/contexts/AIContext";

/* ⚙️ Cathlab JARVIS DiagnosticPanel v3.7.0
   🧠 Visualisasi AIContext (Singularity Edition)
   🔹 Menampilkan status sistem, latency, insight, dan mode AI
   💠 Gaya hologram Gold-Cyan Hybrid
*/

export default function DiagnosticPanel() {
  const { mode, lastInsight, latency } = useAI();

  const isRepairing = mode === "repairing";
  const isStable = mode === "idle";
  const isDiagnosing = mode === "diagnosing";

  return (
    <motion.div
      className="p-6 rounded-2xl bg-gradient-to-b from-[#0a0f18]/90 via-[#0d1c28]/80 to-[#0c1825]/90
                 border border-cyan-500/20 shadow-[0_0_35px_rgba(0,255,255,0.15)]
                 backdrop-blur-xl text-cyan-100 relative overflow-hidden"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Cpu
          size={26}
          className="text-yellow-400 drop-shadow-[0_0_6px_#FFD700]"
        />
        <h2 className="text-xl font-bold tracking-widest text-cyan-300">
          JARVIS DIAGNOSTIC PANEL
        </h2>
      </div>

      {/* Status Section */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatusCard
          icon={<Database />}
          label="Supabase"
          value={
            isStable
              ? "Connected"
              : isRepairing
              ? "Reconnecting..."
              : "Checking..."
          }
          color={
            isStable
              ? "text-green-400"
              : isRepairing
              ? "text-yellow-400"
              : "text-cyan-400"
          }
        />
        <StatusCard
          icon={<Activity />}
          label="Latency"
          value={`${latency} ms`}
          color={
            latency < 300
              ? "text-green-400"
              : latency < 800
              ? "text-yellow-400"
              : "text-red-400"
          }
        />
        <StatusCard
          icon={<Timer />}
          label="Mode"
          value={mode.toUpperCase()}
          color={
            isStable
              ? "text-green-400"
              : isRepairing
              ? "text-yellow-400"
              : "text-cyan-400"
          }
        />
      </div>

      {/* Insight */}
      <motion.div
        className="mt-6 p-4 rounded-xl border border-cyan-500/20 bg-[#0d1c28]/70 shadow-inner"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-sm text-cyan-400 mb-2 font-semibold tracking-wide">
          Insight:
        </p>
        <motion.p
          key={lastInsight}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`text-base ${
            isStable
              ? "text-green-300"
              : isRepairing
              ? "text-yellow-300"
              : "text-cyan-200"
          }`}
        >
          {lastInsight}
        </motion.p>
      </motion.div>

      {/* Visual indicator */}
      <motion.div
        className="mt-6 flex justify-center items-center gap-3 text-sm"
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: isRepairing ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      >
        {isStable && (
          <>
            <CheckCircle2 size={16} className="text-green-400" />
            <span className="text-green-300">System Stable</span>
          </>
        )}
        {isRepairing && (
          <>
            <RefreshCw
              size={16}
              className="text-yellow-400 animate-spin-slow"
            />
            <span className="text-yellow-300">Self-Healing in Progress...</span>
          </>
        )}
        {isDiagnosing && (
          <>
            <AlertTriangle size={16} className="text-cyan-400" />
            <span className="text-cyan-300">Running Diagnostics...</span>
          </>
        )}
      </motion.div>

      {/* Decorative Glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            "radial-gradient(circle at 20% 30%, rgba(0,255,255,0.05), transparent 60%)",
            "radial-gradient(circle at 80% 70%, rgba(255,215,0,0.06), transparent 60%)",
          ],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </motion.div>
  );
}

/* 🧱 Kartu status kecil */
function StatusCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 150, damping: 12 }}
      className="flex flex-col items-start p-4 rounded-xl border border-cyan-500/20 bg-[#0c1925]/70 shadow-[0_0_15px_rgba(0,255,255,0.1)]"
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="text-cyan-400">{icon}</div>
        <span className="text-xs text-cyan-400 font-semibold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </motion.div>
  );
}

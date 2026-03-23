"use client";
import { motion } from "framer-motion";
import { ShieldPlus, Activity, Clock } from "lucide-react";

export default function TindakanHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between rounded-2xl bg-gradient-to-br from-cyan-900/40 via-black/40 to-amber-900/30 border border-cyan-500/30 shadow-lg shadow-cyan-800/30 p-5 backdrop-blur-sm"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-cyan-300 tracking-wide drop-shadow-sm flex items-center gap-2">
          <ShieldPlus className="w-6 h-6 text-amber-400" />
          Data Tindakan Cathlab
        </h1>
        <p className="text-sm text-gray-400">
          Monitoring dan rekap tindakan intervensi kardiovaskular.
        </p>
      </div>

      <div className="mt-4 md:mt-0 flex items-center gap-4 text-sm text-cyan-200/80">
        <div className="flex items-center gap-1">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Aktif</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>
            {new Date().toLocaleString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none bg-gradient-to-r from-cyan-500/10 via-transparent to-amber-400/10"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
    </motion.div>
  );
}

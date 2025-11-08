"use client";
import { motion } from "framer-motion";

export default function LoadingShimmer() {
  const color = "#00ffff"; // warna utama JARVIS

  return (
    <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-black/70 border border-cyan-400/20 backdrop-blur-md shadow-[0_0_25px_rgba(0,255,255,0.15)]">
      {/* ✨ Lapisan shimmer bergerak */}
      <motion.div
        initial={{ x: "-120%" }}
        animate={{ x: "120%" }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
      />

      {/* 💠 Efek energi pusat (sinkron dengan core JarvisLoader) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0.6, scale: 0.9 }}
        animate={{
          scale: [0.9, 1.05, 0.9],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <motion.div
          className="rounded-full"
          style={{
            width: 40,
            height: 40,
            border: `1px solid ${color}`,
            boxShadow: `0 0 20px ${color}66, 0 0 40px ${color}33`,
          }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 12,
            height: 12,
            backgroundColor: color,
            boxShadow: `0 0 25px ${color}, 0 0 50px ${color}88`,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* 🧠 Status hologram teks */}
      <div className="absolute inset-0 flex items-center justify-center text-cyan-300/70 tracking-[0.2em] text-[0.85rem] font-light">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          SYNCHRONIZING MODULE...
        </motion.span>
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";

export default function ECGLine() {
  return (
    <div className="absolute bottom-16 left-0 w-full overflow-hidden select-none opacity-70">
      {/* Garis cahaya bergerak */}
      <motion.div
        className="absolute h-[2px] w-[200%] bg-gradient-to-r from-blue-500 via-pink-500 to-purple-600"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      {/* Pola ECG menggunakan SVG */}
      <svg
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
        className="w-full h-[100px] opacity-80"
      >
        <motion.path
          d="
            M0,50 
            L100,50 
            L120,10 
            L140,90 
            L160,50 
            L300,50 
            L320,10 
            L340,90 
            L360,50 
            L1200,50
          "
          stroke="url(#ecgGradient)"
          strokeWidth="2"
          fill="none"
          animate={{ pathLength: [0.8, 1, 0.8] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <defs>
          <linearGradient id="ecgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Cahaya menyapu */}
      <motion.div
        className="absolute top-0 left-0 w-[150px] h-[2px] bg-white/70 blur-sm"
        animate={{ x: ["-10%", "120%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

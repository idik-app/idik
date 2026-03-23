"use client";

import { motion } from "framer-motion";

export default function QuantumMeshGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* BACKGROUND FADE */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent" />

      {/* 3D MESH WAVE – LAYER 1 */}
      <motion.div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(0,255,255,0.25) 1px, transparent 1px),
            linear-gradient(0deg, rgba(0,255,255,0.25) 1px, transparent 1px)
          `,
          backgroundSize: "55px 55px",
        }}
        animate={{
          backgroundPositionX: ["0px", "55px"],
          backgroundPositionY: ["0px", "55px"],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* 3D MESH WAVE – LAYER 2 */}
      <motion.div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(255,215,0,0.25) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,215,0,0.25) 1px, transparent 1px)
          `,
          backgroundSize: "85px 85px",
        }}
        animate={{
          backgroundPositionX: ["85px", "0px"],
          backgroundPositionY: ["85px", "0px"],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* FRACTAL DISTORTION (subtle hologram shimmer) */}
      <motion.div
        className="absolute inset-0 mix-blend-screen"
        style={{
          backgroundImage: `
            radial-gradient(circle at 30% 30%, rgba(0,255,255,0.15), transparent 40%),
            radial-gradient(circle at 70% 70%, rgba(255,215,0,0.15), transparent 40%)
          `,
        }}
        animate={{
          opacity: [0.1, 0.25, 0.1],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* ENERGY PULSE NODES */}
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[6px] h-[6px] rounded-full bg-cyan-300"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            filter: "blur(1px)",
          }}
          animate={{
            opacity: [0.1, 1, 0.1],
            scale: [0.4, 1.4, 0.4],
            x: [0, Math.random() * 20 - 10, 0],
            y: [0, Math.random() * 20 - 10, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* IRON LEGION IRIS RIPPLE */}
      <motion.div
        className="absolute inset-0"
        animate={{
          scale: [1, 1.15, 1],
          rotate: [0, 45, 0],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,200,255,0.22) 0%, rgba(0,0,0,0) 75%)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}

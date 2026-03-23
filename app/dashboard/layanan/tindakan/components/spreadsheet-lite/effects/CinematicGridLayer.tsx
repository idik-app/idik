"use client";

import { motion } from "framer-motion";

export default function CinematicGridLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Rainbow Cyan-Gold Scanline (slow sweep) */}
      <motion.div
        className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r
                   from-cyan-400 via-gold-300 to-cyan-400 opacity-40"
        animate={{
          y: ["0%", "100%"],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Parallax Grid (far layer) */}
      <motion.div
        className="absolute inset-0 opacity-[0.22] bg-[linear-gradient(90deg,rgba(0,255,255,0.15)_1px,transparent_1px),
                                              linear-gradient(180deg,rgba(0,255,255,0.15)_1px,transparent_1px)]"
        style={{
          backgroundSize: "40px 40px",
        }}
        animate={{
          backgroundPositionX: ["0px", "40px"],
          backgroundPositionY: ["0px", "40px"],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Parallax Grid (mid layer) */}
      <motion.div
        className="absolute inset-0 opacity-[0.35] bg-[linear-gradient(90deg,rgba(255,215,0,0.18)_1px,transparent_1px),
                                              linear-gradient(180deg,rgba(255,215,0,0.18)_1px,transparent_1px)]"
        style={{
          backgroundSize: "60px 60px",
        }}
        animate={{
          backgroundPositionX: ["60px", "0px"],
          backgroundPositionY: ["60px", "0px"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-[3px] h-[3px] rounded-full bg-cyan-300"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.35,
            }}
            animate={{
              y: ["0px", "-25px", "0px"],
              x: ["0px", "5px", "0px"],
              opacity: [0.1, 0.4, 0.1],
            }}
            transition={{
              duration: 4 + Math.random() * 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface JarvisAgentProps {
  size?: number;
  className?: string;
  status?: "idle" | "learning" | "diagnosing" | "repairing" | "success" | "error";
  lightMode?: boolean;
  isOpen?: boolean;
}

export default function JarvisAgent({
  size = 150,
  className = "",
  status = "idle",
  lightMode = false,
  isOpen = false,
}: JarvisAgentProps) {
  // Color Mapping from Image 2 (Arc Reactor v2)
  const getColors = () => {
    switch (status) {
      case "error": return { primary: "#ef4444", secondary: "#7f1d1d", glow: "rgba(239, 68, 68, 0.5)" }; // MALFUNCTION
      case "success": return { primary: "#10b981", secondary: "#064e3b", glow: "rgba(16, 185, 129, 0.5)" };
      case "diagnosing": return { primary: "#a855f7", secondary: "#581c87", glow: "rgba(168, 85, 247, 0.5)" }; // SCANNING
      case "learning": return { primary: "#eab308", secondary: "#713f12", glow: "rgba(234, 179, 8, 0.5)" }; // PROCESSING
      default: return { primary: "#22d3ee", secondary: "#164e63", glow: "rgba(34, 211, 238, 0.5)" }; // SYSTEM IDLE
    }
  };

  const colors = getColors();

  return (
    <div 
      style={{ width: size, height: size * 1.2 }} 
      className={cn("relative flex items-center justify-center select-none pointer-events-none group", className)}
    >
      <svg
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <filter id="coreGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- Background Outer Rings (From Image 2) --- */}
        <motion.circle
          cx="50"
          cy="55"
          r="45"
          stroke={colors.primary}
          strokeWidth="0.5"
          strokeDasharray="5 10"
          className="opacity-20"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        />
        <motion.circle
          cx="50"
          cy="55"
          r="38"
          stroke={colors.primary}
          strokeWidth="1"
          strokeDasharray="2 4"
          className="opacity-30"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
        />

        {/* --- Armored Floating Plates (The "Body") --- */}
        <motion.g
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          {/* Main Chest Plate (The "V" Shape) */}
          <path
            d="M30 45 L50 38 L70 45 L75 65 L50 85 L25 65 Z"
            fill={colors.secondary}
            fillOpacity="0.3"
            stroke={colors.primary}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          
          {/* Shoulder Guards */}
          <path d="M22 42 Q15 45, 18 55" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" className="opacity-80" />
          <path d="M78 42 Q85 45, 82 55" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" className="opacity-80" />
          
          {/* Neck Support */}
          <path d="M42 35 L50 32 L58 35" stroke={colors.primary} strokeWidth="1" fill="none" className="opacity-60" />
        </motion.g>

        {/* --- ARC REACTOR CORE (The Heart - Centerpiece) --- */}
        <motion.g
          animate={{
            scale: status === "idle" ? [1, 1.05, 1] : [1, 1.15, 1],
          }}
          transition={{ repeat: Infinity, duration: status === "idle" ? 2 : 0.8 }}
        >
          {/* Outer Core Hexagon */}
          <path
            d="M50 45 L58 50 L58 60 L50 65 L42 60 L42 50 Z"
            fill="none"
            stroke={colors.primary}
            strokeWidth="2"
            filter="url(#coreGlow)"
          />
          {/* Inner Glowing Circle or X if Open */}
          <AnimatePresence mode="wait">
            {!isOpen ? (
              <motion.circle
                key="core-dot"
                cx="50"
                cy="55"
                r="6"
                fill="white"
                fillOpacity="0.9"
                filter="url(#coreGlow)"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
              />
            ) : (
              <motion.g
                key="close-x"
                initial={{ opacity: 0, rotate: -90, scale: 0 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <path
                  d="M45 50 L55 60 M55 50 L45 60"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </motion.g>
            )}
          </AnimatePresence>
          {/* Rotating Rings around Core */}
          <motion.circle
            cx="50"
            cy="55"
            r="10"
            stroke={colors.primary}
            strokeWidth="1"
            strokeDasharray="2 2"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          />
        </motion.g>

        {/* --- HEAD / MASK (Floating above) --- */}
        <motion.g 
          transform="translate(35, 2) scale(0.3)"
          animate={{ y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
        >
          {/* Mask Outline */}
          <path
            d="M50 10 C35 10, 22 18, 20 35 L18 55 C18 75, 30 85, 35 88 L50 95 L65 88 C70 85, 82 75, 82 55 L80 35 C78 18, 65 10, 50 10 Z"
            fill={colors.secondary}
            fillOpacity="0.5"
            stroke="white"
            strokeWidth="3"
          />
          {/* Eyes (Glowing) */}
          <motion.path
            d="M32 48 L44 52 L44 55 L32 52 Z M56 52 L68 48 L68 52 L56 55 Z"
            fill="white"
            animate={{ opacity: [0.7, 1, 0.7], scaleY: [1, 0.1, 1] }}
            transition={{ repeat: Infinity, duration: 5, times: [0, 0.98, 1] }}
          />
        </motion.g>

        {/* --- Energy Thrusters (Minimalist) --- */}
        <motion.g
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scaleY: [0.8, 1.2, 0.8],
          }}
          transition={{ repeat: Infinity, duration: 0.2 }}
        >
          <path d="M45 85 L48 100 M55 85 L52 100" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
        </motion.g>
      </svg>

      {/* --- HUD Label (Only show if size is large enough) --- */}
      {size > 80 && (
        <motion.div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-cyan-500/30 px-4 py-0.5 rounded-sm text-[9px] font-mono tracking-[0.2em] text-cyan-400 whitespace-nowrap shadow-[0_0_10px_rgba(34,211,238,0.2)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
        >
          {status.toUpperCase()} MODE
        </motion.div>
      )}
    </div>
  );
}

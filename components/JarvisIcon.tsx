"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface JarvisIconProps {
  size?: number | string;
  className?: string;
  isSyncing?: boolean;
  hasNotifications?: boolean;
  lightMode?: boolean;
  status?:
    | "idle"
    | "learning"
    | "diagnosing"
    | "repairing"
    | "success"
    | "error";
}

export default function JarvisIcon({
  size,
  className = "",
  isSyncing = false,
  hasNotifications = false,
  lightMode = false,
  status = "idle",
}: JarvisIconProps) {
  const [internalStatus, setInternalStatus] = useState(status);

  // Auto-reset success/error status to idle after animation
  useEffect(() => {
    if (status === "success" || status === "error") {
      setInternalStatus(status);
      const timer = setTimeout(() => setInternalStatus("idle"), 2000);
      return () => clearTimeout(timer);
    }
    setInternalStatus(status);
  }, [status]);

  const style = size ? { width: size, height: size } : {};

  // Color Mapping based on Status
  const getColors = () => {
    if (internalStatus === "error")
      return { primary: "#ef4444", secondary: "#991b1b" };
    if (internalStatus === "success")
      return { primary: "#10b981", secondary: "#065f46" };
    if (internalStatus === "diagnosing")
      return { primary: "#a855f7", secondary: "#6b21a8" };
    if (internalStatus === "learning")
      return { primary: "#f59e0b", secondary: "#b45309" };
    if (hasNotifications) return { primary: "#f59e0b", secondary: "#d97706" };
    return lightMode
      ? { primary: "#0891b2", secondary: "#0e7490" }
      : { primary: "#22d3ee", secondary: "#0891b2" };
  };

  const colors = getColors();

  return (
    <motion.svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={cn(
        "relative z-10 transition-all duration-500 group cursor-pointer",
        isSyncing && internalStatus === "idle"
          ? "opacity-40 scale-95 blur-[0.5px]"
          : "opacity-100",
        className
      )}
      initial="idle"
      whileHover="hover"
      whileTap="tap"
    >
      <defs>
        <linearGradient id="jarvisGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.secondary} />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        {/* Glow for Success/Error Flare */}
        <filter id="outerGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. Outer Ring (Rotating & Pulsing) */}
      <motion.circle
        cx="50"
        cy="50"
        r="48"
        stroke={colors.primary}
        strokeWidth="1"
        strokeDasharray="4 4"
        className="opacity-20"
        animate={{
          rotate: isSyncing || internalStatus === "learning" ? 360 : [0, 90],
          scale: internalStatus === "diagnosing" ? [1, 1.05, 1] : 1,
        }}
        transition={{
          rotate: {
            repeat: Infinity,
            duration: isSyncing ? 2 : 10,
            ease: "linear",
          },
          scale: { repeat: Infinity, duration: 1 },
        }}
      />

      {/* 2. Success/Error Energy Flare (Behind Mask) */}
      <AnimatePresence>
        {(internalStatus === "success" || internalStatus === "error") && (
          <motion.circle
            cx="50"
            cy="50"
            initial={{ r: 20, opacity: 0, strokeWidth: 10 }}
            animate={{ r: 45, opacity: [0, 0.5, 0], strokeWidth: 0 }}
            exit={{ opacity: 0 }}
            stroke={colors.primary}
            fill="none"
            transition={{ duration: 0.8, ease: "easeOut" }}
            filter="url(#outerGlow)"
          />
        )}
      </AnimatePresence>

      <motion.g
        variants={{
          hover: { scale: 1.05 },
          tap: { scale: 0.95 },
        }}
        style={{ transformOrigin: "center" }}
      >
        {/* 3. Main Face Plate (Neural Heartbeat) */}
        <motion.path
          d="M50 10 C35 10, 22 18, 20 35 L18 55 C18 75, 30 85, 35 88 L50 95 L65 88 C70 85, 82 75, 82 55 L80 35 C78 18, 65 10, 50 10 Z"
          fill="url(#jarvisGradient)"
          fillOpacity={lightMode ? "0.05" : "0.1"}
          stroke="url(#jarvisGradient)"
          strokeWidth="2"
          strokeLinejoin="round"
          filter={lightMode ? "" : "url(#glow)"}
          animate={{
            strokeWidth:
              internalStatus === "diagnosing" ? [2, 3, 2] : [2, 2.5, 2],
            opacity: internalStatus === "error" ? [1, 0.5, 1] : 1,
            x: internalStatus === "error" ? [0, -1, 1, -1, 0] : 0, // Glitch shake
          }}
          transition={{
            strokeWidth: { repeat: Infinity, duration: 3, ease: "easeInOut" },
            x: {
              repeat: internalStatus === "error" ? Infinity : 0,
              duration: 0.1,
            },
          }}
        />

        {/* 4. Scanning Beam (Only in Diagnosing) */}
        {internalStatus === "diagnosing" && (
          <motion.rect
            x="25"
            y="40"
            width="50"
            height="1"
            fill={colors.primary}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: [40, 65, 40], opacity: [0, 0.8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            filter="url(#glow)"
          />
        )}

        {/* 5. Internal Mechanical Lines (Morph on Hover) */}
        <motion.path
          d="M30 40 L35 45 M65 45 L70 40 M40 80 L50 85 L60 80"
          stroke="currentColor"
          strokeWidth="1"
          className={cn(
            "transition-colors duration-500",
            internalStatus === "error"
              ? "text-red-500/40"
              : internalStatus === "success"
              ? "text-emerald-500/40"
              : "text-cyan-400/40"
          )}
          variants={{
            idle: { pathLength: 0.3, opacity: 0.2 },
            hover: { pathLength: 1, opacity: 0.6 },
          }}
        />

        {/* 6. Eye Slits (Dynamic Expressions) */}
        <motion.path
          d="M32 48 L44 52 L44 55 L32 52 Z M56 52 L68 48 L68 52 L56 55 Z"
          fill={colors.primary}
          animate={{
            // Neural Heartbeat & Status Expression
            opacity:
              internalStatus === "error"
                ? [0.4, 1, 0.4]
                : internalStatus === "diagnosing"
                ? [0.8, 1, 0.8]
                : [0.4, 1, 0.7, 1, 0.4],
            scale:
              internalStatus === "learning"
                ? [1, 1.1, 1]
                : internalStatus === "diagnosing"
                ? [1, 0.95, 1]
                : [1, 1.05, 1],
          }}
          transition={{
            repeat: Infinity,
            duration:
              internalStatus === "error"
                ? 0.2
                : internalStatus === "learning"
                ? 0.8
                : 2.8,
            ease: "easeInOut",
          }}
        />

        {/* 7. Forehead Detail */}
        <motion.path
          d="M45 25 L50 30 L55 25"
          stroke="url(#jarvisGradient)"
          strokeWidth="1.5"
          fill="none"
          variants={{
            idle: { y: 0, opacity: 0.5 },
            hover: { y: -2, opacity: 1 },
          }}
        />
      </motion.g>
    </motion.svg>
  );
}

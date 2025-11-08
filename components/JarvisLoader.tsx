"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import "@app/styles/jarvis.css";

interface JarvisLoaderProps {
  mode?: "full" | "dashboard" | "logout";
  autoRedirect?: boolean;
}

export default function JarvisLoader({
  mode = "full",
  autoRedirect = false,
}: JarvisLoaderProps) {
  const router = useRouter();
  const [textIndex, setTextIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  /* ─────────── Pesan Status ─────────── */
  const messages =
    mode === "logout"
      ? [
          "Logging out of JARVIS Systems...",
          "Clearing Session Cache...",
          "Disconnecting Cathlab Network...",
          "Goodbye, Habibur Rahman.",
        ]
      : mode === "full"
      ? [
          "Initializing JARVIS Systems...",
          "Authenticating Cathlab Access...",
          "Calibrating Sensors...",
          "Access Granted.",
          "Welcome, Habibur Rahman.",
        ]
      : ["Synchronizing Module...", "Processing Data...", "Module Ready."];

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % messages.length);
    }, 1000);

    const duration = mode === "logout" ? 3500 : mode === "full" ? 5000 : 1500;

    const timeout = setTimeout(() => {
      const loader = document.querySelector(".jarvis-loader");
      if (loader) loader.classList.add("fade-out");

      setTimeout(() => {
        setVisible(false);
        if (autoRedirect) {
          if (mode === "logout") router.push("/");
          else if (mode === "full") router.push("/dashboard");
        }
      }, 800);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router, messages.length, autoRedirect, mode]);

  /* ─────────── Warna utama ─────────── */
  const color = "#00ffff";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`jarvis-loader ${
            mode === "dashboard" ? "dashboard-mode" : ""
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
          {/* 🌐 Latar grid hologram */}
          <div className="holo-grid" />

          {/* 🌌 Efek Pulse AI Core (khusus dashboard) */}
          {mode === "dashboard" && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0.7, scale: 0.9 }}
              animate={{
                scale: [0.9, 1.1, 0.9],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <motion.div
                className="rounded-full"
                style={{
                  width: 80,
                  height: 80,
                  border: `2px solid ${color}`,
                  boxShadow: `0 0 25px ${color}66, 0 0 50px ${color}33`,
                }}
              />
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: color,
                  boxShadow: `0 0 30px ${color}, 0 0 60px ${color}88`,
                }}
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          )}

          {/* 🌀 Cincin berputar */}
          <motion.div
            className="ring"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          />

          {/* 🤖 Ikon Ironman */}
          <motion.div
            className="ironman-mask"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <svg
              viewBox="0 0 512 512"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="ironman-svg"
            >
              <path
                d="M256 20C150 20 60 110 60 216c0 84 48 156 120 190v60h152v-60c72-34 120-106 120-190 0-106-90-196-196-196zM180 216h-40v-56h40v56zm192 0h-40v-56h40v56z"
                fill="#00ffff"
                stroke="#f4b400"
                strokeWidth="4"
                filter="url(#glow)"
              />
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>
          </motion.div>

          {/* 💬 Status teks */}
          <motion.p
            key={textIndex}
            className="status-text"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
          >
            {messages[textIndex]}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

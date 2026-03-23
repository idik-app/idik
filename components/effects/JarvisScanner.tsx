"use client";
import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useState } from "react";

interface JarvisScannerProps {
  isActive?: boolean;
  color?: string;
  duration?: number;
}

/**
 * 🧠 JarvisScanner v3.7 — Efek pemindaian holografik stabil
 * - Benar-benar berhenti saat isActive = false
 * - Tidak ada repeat Infinity setelah dinonaktifkan
 */
export default function JarvisScanner({
  isActive = false,
  color = "rgba(0,255,255,0.4)",
  duration = 3.2,
}: JarvisScannerProps) {
  const [visible, setVisible] = useState(false);
  const beamCtrl = useAnimationControls();
  const pulseCtrl = useAnimationControls();

  useEffect(() => {
    if (isActive) {
      setVisible(true);
      // mulai animasi sekali
      beamCtrl.start({
        y: ["-60%", "100%"],
        opacity: [0.6, 0.8, 0.6],
        transition: { duration, ease: "easeInOut", repeat: Infinity },
      });
      pulseCtrl.start({
        opacity: [0.3, 0.6, 0.3],
        scale: [1, 1.02, 1],
        transition: {
          duration: duration * 1.2,
          ease: "easeInOut",
          repeat: Infinity,
        },
      });
    } else {
      // hentikan animasi segera dan sembunyikan
      beamCtrl.stop();
      pulseCtrl.stop();
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [isActive, beamCtrl, pulseCtrl, duration]);

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        backdropFilter: "blur(1px)",
      }}
    >
      <motion.div
        className="absolute left-0 top-0 w-full h-[40%]"
        style={{
          background: `linear-gradient(to bottom, ${color}, transparent 80%)`,
          mixBlendMode: "screen",
        }}
        animate={beamCtrl}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${color.replace(
            "0.4",
            "0.15"
          )} 0%, transparent 70%)`,
          mixBlendMode: "screen",
        }}
        animate={pulseCtrl}
      />
    </div>
  );
}

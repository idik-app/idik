"use client";
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

  useEffect(() => {
    if (isActive) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [isActive]);

  if (!visible) return null;

  const pulseColor = color.replace("0.4", "0.15");
  const beamDuration = `${Math.max(0.1, duration)}s`;
  const pulseDuration = `${Math.max(0.1, duration * 1.2)}s`;

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
      <div
        className="absolute left-0 top-0 w-full h-[40%]"
        style={{
          background: `linear-gradient(to bottom, ${color}, transparent 80%)`,
          mixBlendMode: "screen",
          animation: `jarvisScanBeam ${beamDuration} ease-in-out infinite`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${pulseColor} 0%, transparent 70%)`,
          mixBlendMode: "screen",
          animation: `jarvisScanPulse ${pulseDuration} ease-in-out infinite`,
        }}
      />
      <style jsx>{`
        @keyframes jarvisScanBeam {
          0% {
            transform: translateY(-60%);
            opacity: 0.6;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(100%);
            opacity: 0.6;
          }
        }

        @keyframes jarvisScanPulse {
          0% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.02);
          }
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

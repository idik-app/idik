import { cn } from "@/lib/utils";
import React from "react";

/**
 * Komponen Shimmer Loading
 * Memberikan efek animasi berkedip/menyala yang halus, ideal untuk placeholder.
 */
interface ShimmerProps {
  /** Kelas Tailwind tambahan untuk styling lebar, tinggi, dan margin. */
  className?: string;
}

const Shimmer: React.FC<ShimmerProps> = ({ className }) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-gray-800/60", // Base style: dark background
        className
      )}
    >
      {/* Glow/Sweep Effect:
        - Membuat lapisan transparan yang bergerak melintasi div
        - Menggunakan keyframes 'shimmer' untuk animasi pergerakan
      */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-700/30 to-transparent animate-shimmer" />

      {/* Definisi Animasi CSS untuk pergerakan Shimmer */}
      <style>{`
  /* Pastikan Anda menggunakan nama kelas unik untuk mencegah konflik global */
  @keyframes shimmer-idik {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  .animate-shimmer {
    animation: shimmer-idik 1.5s infinite;
  }
`}</style>
    </div>
  );
};

export default Shimmer;

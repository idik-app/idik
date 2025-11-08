"use client";

import React from "react";

const shimmerLeft = Array.from({ length: 6 });
const shimmerRight = Array.from({ length: 5 });

const PasienSkeleton = React.memo(() => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/60 jarvis-glass animate-fade-slide-up p-6">
      {/* ✨ Layer hologram reflection */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--cyan))/0.05] via-transparent to-[hsl(var(--gold))/0.05] blur-2xl rounded-2xl pointer-events-none" />

      {/* 🔦 Hologram scanning shimmer */}
      <div className="absolute inset-0 animate-hologram-scan rounded-2xl opacity-50" />

      {/* Header shimmer */}
      <div className="flex justify-between items-center mb-5 relative z-10">
        <div className="h-5 w-56 bg-[hsl(var(--cyan))/0.2] rounded-md animate-pulse-glow" />
        <div className="h-4 w-14 bg-[hsl(var(--cyan))/0.1] rounded-md animate-pulse-glow" />
      </div>

      {/* Grid shimmer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        <div className="space-y-3">
          {shimmerLeft.map((_, i) => (
            <div
              key={`left-${i}`}
              className="h-4 bg-[hsl(var(--cyan))/0.15] rounded-md animate-[pulse_2s_infinite_ease-in-out]"
            />
          ))}
        </div>

        <div className="space-y-3">
          {shimmerRight.map((_, i) => (
            <div
              key={`right-${i}`}
              className="h-4 bg-[hsl(var(--cyan))/0.15] rounded-md animate-[pulse_2s_infinite_ease-in-out]"
            />
          ))}
        </div>
      </div>

      {/* Footer shimmer */}
      <div className="flex justify-end mt-6 pt-4 border-t border-[hsl(var(--border))] relative z-10">
        <div className="h-8 w-36 rounded-lg bg-gradient-to-r from-[hsl(var(--gold))/0.3] to-[hsl(var(--cyan))/0.3] animate-pulse-glow" />
      </div>
    </div>
  );
});

PasienSkeleton.displayName = "PasienSkeleton";
export default PasienSkeleton;

"use client";

export default function DokterSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-10 bg-gradient-to-r from-cyan-800/40 to-yellow-600/40 rounded-xl"
        ></div>
      ))}
    </div>
  );
}

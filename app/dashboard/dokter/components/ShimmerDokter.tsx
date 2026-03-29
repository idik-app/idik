"use client";

export default function ShimmerDokter() {
  return (
    <div
      className="animate-pulse space-y-3 mt-6 rounded-xl border border-cyan-500/20 bg-black/30 p-4"
      role="status"
      aria-label="Memuat data dokter"
    >
      <p className="text-sm text-cyan-400/90 mb-2">Memuat data dokter…</p>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-md bg-gradient-to-r from-cyan-900/40 via-cyan-600/25 to-cyan-900/40"
        />
      ))}
    </div>
  );
}

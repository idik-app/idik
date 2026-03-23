// app/components/UpdateBanner.tsx
"use client";
import { useAppUpdate } from "@/core/hooks/useAppUpdate";

export default function UpdateBanner() {
  const { updateReady, updateApp } = useAppUpdate();

  if (!updateReady) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-cyan-900/70 text-white border border-cyan-400 rounded-xl px-6 py-3 shadow-lg animate-pulse backdrop-blur-lg">
      <p className="font-semibold">🚀 Versi baru IDIK-App tersedia</p>
      <button
        onClick={updateApp}
        className="mt-2 px-4 py-1 bg-gradient-to-r from-cyan-400 to-yellow-400 text-black font-bold rounded-lg shadow-md hover:scale-105 transition-transform"
      >
        Muat Ulang Sekarang
      </button>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Brain, Zap } from "lucide-react";

interface Status {
  mode: "learning" | "alert" | "predictive" | "idle";
  message: string;
}

export default function AIStatusPanel() {
  const [status, setStatus] = useState<Status>({
    mode: "learning",
    message: "Menganalisis pola pasien dan pemakaian alat...",
  });

  // simulasi dinamis
  useEffect(() => {
    const timer = setInterval(() => {
      const states: Status[] = [
        {
          mode: "learning",
          message: "Menganalisis pola pasien dan pemakaian alat...",
        },
        {
          mode: "predictive",
          message: "Prediksi kebutuhan stent naik 12% minggu depan.",
        },
        {
          mode: "alert",
          message: "Deteksi anomali: 3 alat ED < 30 hari!",
        },
        {
          mode: "idle",
          message: "Menunggu input data baru dari Cathlab...",
        },
      ];
      const next = states[Math.floor(Math.random() * states.length)];
      setStatus(next);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const icon =
    status.mode === "learning" ? (
      <Brain className="text-cyan-400" size={26} />
    ) : status.mode === "alert" ? (
      <AlertTriangle className="text-red-400" size={26} />
    ) : status.mode === "predictive" ? (
      <Zap className="text-yellow-400" size={26} />
    ) : (
      <Activity className="text-gray-400" size={26} />
    );

  const glowColor =
    status.mode === "alert"
      ? "shadow-red-500/40"
      : status.mode === "predictive"
      ? "shadow-yellow-400/40"
      : "shadow-cyan-400/40";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-700/40 bg-white/5 backdrop-blur-md p-6 shadow-lg shadow-cyan-700/10">
      {/* Hologram animasi inti */}
      <div
        className={`absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-tr from-cyan-400/20 to-gold-400/10 blur-3xl ${glowColor} animate-spin`}
        style={{ animationDuration: "30s" }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-full bg-cyan-900/30 border border-cyan-600/50 shadow-inner">
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-cyan-200">
          Cathlab Intelligent Core
        </h2>
      </div>

      {/* Status Utama */}
      <div key={status.message} className="animate-in fade-in slide-in-from-top-1 duration-300">
        <p className="text-sm text-cyan-100/90">{status.message}</p>
      </div>

      {/* Footer */}
      <div className="mt-5 flex justify-between items-center text-xs text-gray-400">
        <p>
          Mode:{" "}
          <span className="uppercase text-cyan-300 font-medium">
            {status.mode}
          </span>
        </p>
        <button className="border border-cyan-600/40 hover:bg-cyan-700/20 px-3 py-1 rounded-lg transition">
          Lihat Insight
        </button>
      </div>
    </div>
  );
}

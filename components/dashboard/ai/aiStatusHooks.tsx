"use client";
import { useEffect, useState } from "react";

export type AIMode = "learning" | "predictive" | "alert" | "idle";

export interface AIStatus {
  mode: AIMode;
  message: string;
}

export function useAIStatus(interval = 10000) {
  const [status, setStatus] = useState<AIStatus>({
    mode: "learning",
    message: "Menganalisis pola pasien dan pemakaian alat...",
  });

  useEffect(() => {
    const states: AIStatus[] = [
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

    const timer = setInterval(() => {
      const next = states[Math.floor(Math.random() * states.length)];
      setStatus(next);
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return status;
}

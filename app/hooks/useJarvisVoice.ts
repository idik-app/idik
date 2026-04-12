"use client";

import { useCallback } from "react";

export const useJarvisVoice = () => {
  const speak = useCallback((text: string, options?: { pitch?: number; rate?: number; volume?: number }) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Batalkan suara sebelumnya agar tidak bertumpuk
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Konfigurasi JARVIS-like voice
    const voices = window.speechSynthesis.getVoices();
    
    // Prioritas 1: Microsoft James (British) - sangat mirip JARVIS
    // Prioritas 2: Google UK English Male
    // Prioritas 3: Mana saja yang "UK" atau "English"
    const jarvisVoice = 
      voices.find(v => v.name.includes("Microsoft James") || v.name.includes("James")) ||
      voices.find(v => v.name.includes("Google UK English Male")) ||
      voices.find(v => v.name.includes("en-GB")) ||
      voices.find(v => v.lang.startsWith("en"));

    if (jarvisVoice) {
      utterance.voice = jarvisVoice;
    }

    utterance.pitch = options?.pitch ?? 0.9; // Sedikit rendah agar lebih maskulin
    utterance.rate = options?.rate ?? 1.0;  // Kecepatan normal
    utterance.volume = options?.volume ?? 0.6; // Volume proporsional

    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak };
};

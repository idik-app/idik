"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import LoginModal from "@/components/LoginModal";

/* ---------------------------------------------------------
   🔢 PRNG deterministik agar SSR = Client (bebas hydration)
--------------------------------------------------------- */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function CinematicIntro_v3_ArcReactor_Heavy() {
  const router = useRouter();

  /* ---------------------------------------------------------
     ⚙️ STATE UTAMA
  --------------------------------------------------------- */
  const fullText = "Instalasi Diagnostik Intervensi Kardiovaskular";
  const [typedText, setTypedText] = useState("");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<
    "intro" | "login" | "accessGranted" | "accessDenied" | "fadeout"
  >("intro");

  /* ---------------------------------------------------------
     🧠 Mesin Ketik Stabil
  --------------------------------------------------------- */
  useEffect(() => {
    if (phase !== "intro") return;
    const typingSpeed = 80;
    const resetDelay = 1500;

    const timeout =
      index < fullText.length
        ? setTimeout(() => setIndex((i) => i + 1), typingSpeed)
        : setTimeout(() => setIndex(0), resetDelay);

    return () => clearTimeout(timeout);
  }, [index, phase, fullText.length]);

  useEffect(() => {
    setTypedText(fullText.slice(0, index));
  }, [index, fullText]);

  /* ---------------------------------------------------------
     🎧 Audio Ambient & Heartbeat (stabil, tidak autoplay error)
  --------------------------------------------------------- */
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const heartbeatRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    ambientRef.current = new Audio("/sfx/ambient-soft.mp3");
    heartbeatRef.current = new Audio("/sfx/heartbeat-soft.mp3");
    const ambient = ambientRef.current;
    const heartbeat = heartbeatRef.current;

    ambient.loop = heartbeat.loop = true;
    ambient.volume = heartbeat.volume = 0;

    // hanya mulai saat user sudah berinteraksi
    const startAudio = () => {
      ambient.play().catch(() => {});
      heartbeat.play().catch(() => {});

      let vol = 0;
      const fade = setInterval(() => {
        vol += 0.02;
        ambient.volume = Math.min(vol * 0.25, 0.25);
        heartbeat.volume = Math.min(vol * 0.1, 0.1);
        if (vol >= 1) clearInterval(fade);
      }, 300);

      window.removeEventListener("click", startAudio);
    };

    window.addEventListener("click", startAudio);
    return () => {
      window.removeEventListener("click", startAudio);
      ambient.pause();
      heartbeat.pause();
    };
  }, []);

  /* ---------------------------------------------------------
     🔐 Login Event Handler
  --------------------------------------------------------- */
  const handleOpenLogin = () => {
    new Audio("/sfx/click.mp3").play().catch(() => {});
    setPhase("login");
  };

  const handleLoginFinish = () => {
    new Audio("/sfx/confirm.mp3").play().catch(() => {});
    setPhase("accessGranted");

    setTimeout(() => setPhase("fadeout"), 2000);
    setTimeout(() => router.push("/dashboard"), 4800);
  };

  const handleLoginError = () => {
    new Audio("/sfx/denied.mp3").play().catch(() => {});
    setPhase("accessDenied");
    setTimeout(() => setPhase("login"), 2000);
  };

  /* ---------------------------------------------------------
     ✨ Partikel Deterministik
  --------------------------------------------------------- */
  const particles = useMemo(() => {
    const rand = mulberry32(20251013);
    return Array.from({ length: 15 }, () => ({
      width: rand() * 6 + 3,
      height: rand() * 6 + 3,
      top: rand() * 100,
      left: rand() * 100,
      duration: rand() * 6 + 4,
      delay: rand() * 3,
    }));
  }, []);

  /* ---------------------------------------------------------
     🎬 Tampilan Sinematik
  --------------------------------------------------------- */
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#0b0d16] z-[999]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
      >
        {/* ---- Aurora Layer ---- */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute w-[1000px] h-[1000px] bg-gradient-to-tr from-blue-600/25 via-purple-600/15 to-pink-600/20 rounded-full blur-[200px]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
          className="absolute w-[1200px] h-[1200px] bg-gradient-to-bl from-indigo-700/20 via-fuchsia-600/15 to-blue-700/25 rounded-full blur-[250px]"
        />

        {/* ---- Reactor Core ---- */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.03, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[520px] h-[520px] border-[8px] border-t-cyan-400/85 border-r-purple-500/85 border-b-transparent border-l-transparent rounded-full blur-[4px]"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.04, 1],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[560px] h-[560px] border-[8px] border-b-pink-400/75 border-l-blue-500/75 border-t-transparent border-r-transparent rounded-full blur-[5px]"
        />

        {/* ---- Core Glow ---- */}
        <motion.div
          className="absolute w-[150px] h-[150px] bg-[radial-gradient(circle,rgba(59,130,246,0.5),transparent_70%)] rounded-full blur-2xl"
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ---- Partikel ---- */}
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute bg-white/25 rounded-full"
            style={{
              width: p.width,
              height: p.height,
              top: `${p.top}%`,
              left: `${p.left}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
            }}
          />
        ))}

        {/* ---- Logo ---- */}
        <motion.h1
          className="relative z-40 text-7xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-3"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          🩺 IDIK-App
        </motion.h1>

        {/* ---- Efek Mesin Ketik ---- */}
        <motion.p
          className="relative z-40 text-center text-lg md:text-xl font-light tracking-wide text-slate-200"
          style={{
            textShadow:
              "0 0 10px rgba(147,51,234,0.5), 0 0 20px rgba(59,130,246,0.4)",
          }}
        >
          {typedText}
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="inline-block w-[2px] h-[22px] bg-slate-200 ml-1 align-middle"
          />
        </motion.p>

        {/* ---- RSUD Name ---- */}
        <motion.p
          className="relative z-40 text-xs md:text-sm uppercase tracking-[0.25em] text-slate-400 mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5, duration: 1.2 }}
        >
          RSUD dr. Mohamad Soewandhie Surabaya
        </motion.p>

        {/* ---- Tombol Login ---- */}
        {phase === "intro" && (
          <motion.div
            className="relative z-40 mt-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 6 }}
          >
            <motion.button
              onClick={handleOpenLogin}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                backgroundPosition: ["0%", "100%", "0%"],
                boxShadow: [
                  "0 0 25px rgba(59,130,246,0.8)",
                  "0 0 45px rgba(147,51,234,0.9)",
                  "0 0 25px rgba(59,130,246,0.8)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="px-10 py-4 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold uppercase tracking-widest shadow-[0_0_25px_rgba(59,130,246,0.7)]"
            >
              🔐 Login ke Sistem
            </motion.button>
          </motion.div>
        )}

        {/* ---- Modal Login ---- */}
        <AnimatePresence>
          {phase === "login" && (
            <LoginModal
              key="login-modal"
              onClose={() => setPhase("intro")}
              onSuccess={handleLoginFinish}
              onError={handleLoginError}
            />
          )}
        </AnimatePresence>

        {/* ---- Fadeout Transition ---- */}
        {phase === "fadeout" && (
          <motion.div
            key="fadeout"
            className="absolute inset-0 flex items-center justify-center bg-black 
              bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.03)_0px,
              rgba(255,255,255,0.03)_1px,transparent_1px,transparent_2px)] z-[9999]"
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.2 }}
          >
            <motion.h2
              className="text-4xl font-bold text-cyan-400 tracking-widest"
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2 }}
            >
              INITIALIZING&nbsp;JARVIS&nbsp;MODE...
            </motion.h2>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

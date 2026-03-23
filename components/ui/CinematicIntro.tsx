"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
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
  /* ---------------------------------------------------------
     ⚙️ STATE UTAMA
  --------------------------------------------------------- */
  const fullText = "Instalasi Diagnostik Intervensi Kardiovaskular";
  const [typedText, setTypedText] = useState("");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<
    "intro" | "login" | "accessGranted" | "accessDenied"
  >("intro");

  const reducedMotion = useReducedMotion();
  const router = useRouter();

  /* ---------------------------------------------------------
     🧠 Mesin Ketik Stabil
  --------------------------------------------------------- */
  useEffect(() => {
    if (phase !== "intro") return;
    if (reducedMotion) {
      setIndex(fullText.length);
      return;
    }
    const typingSpeed = 80;
    const resetDelay = 1500;

    const timeout =
      index < fullText.length
        ? setTimeout(() => setIndex((i) => i + 1), typingSpeed)
        : setTimeout(() => setIndex(0), resetDelay);

    return () => clearTimeout(timeout);
  }, [index, phase, fullText.length, reducedMotion]);

  useEffect(() => {
    setTypedText(fullText.slice(0, index));
  }, [index, fullText]);

  /* ---------------------------------------------------------
     🎧 Audio Ambient & Heartbeat (stabil, tidak autoplay error)
  --------------------------------------------------------- */
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const heartbeatRef = useRef<HTMLAudioElement | null>(null);

  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioStartedRef = useRef(false);

  const playSfx = useCallback((src: string, volume = 1) => {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  }, []);

  const deniedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessGrantedRedirectRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pendingLoginUrlRef = useRef<string | null>(null);

  /* ---------------------------------------------------------
     🫧 Ripple untuk tombol login (elegan, lembut)
  --------------------------------------------------------- */
  const loginBtnRef = useRef<HTMLButtonElement | null>(null);
  type Ripple = { id: number; x: number; y: number; size: number };
  const [loginRipples, setLoginRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const lastLoginHoverRippleAtRef = useRef(0);
  const loginRippleTimeoutsRef = useRef<
    Map<number, ReturnType<typeof setTimeout>>
  >(new Map());

  const addLoginRipple = useCallback(
    (clientX: number, clientY: number) => {
      if (reducedMotion) return;
      const btn = loginBtnRef.current;
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 0.85;

      const id = ++rippleIdRef.current;
      setLoginRipples((prev) => [...prev, { id, x, y, size }]);

      const t = setTimeout(() => {
        setLoginRipples((prev) => prev.filter((r) => r.id !== id));
        loginRippleTimeoutsRef.current.delete(id);
      }, 800);
      loginRippleTimeoutsRef.current.set(id, t);
    },
    [reducedMotion]
  );

  const handleLoginRippleFromEvent = useCallback(
    (
      e: { clientX: number; clientY: number },
      kind: "hover" | "click"
    ) => {
      if (reducedMotion) return;

      if (kind === "hover") {
        const now = Date.now();
        if (now - lastLoginHoverRippleAtRef.current < 650) return;
        lastLoginHoverRippleAtRef.current = now;
      }

      addLoginRipple(e.clientX, e.clientY);
    },
    [addLoginRipple, reducedMotion]
  );

  /* ---------------------------------------------------------
     🫧 Proximity pulse + artifact (mouse mendekat)
  --------------------------------------------------------- */
  const [proximity, setProximity] = useState(0);
  const proximitySmoothedRef = useRef(0);

  const proximityRafRef = useRef<number | null>(null);
  const proximityLastPointRef = useRef<{ x: number; y: number } | null>(null);
  const proximityDecayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const proximityThresholdPx = 180;

  useEffect(() => {
    if (reducedMotion) {
      proximitySmoothedRef.current = 0;
      setProximity(0);
      return;
    }

    const onMouseMove = (e: MouseEvent) => {
      if (phase !== "intro") {
        proximitySmoothedRef.current = 0;
        setProximity(0);
        return;
      }

      proximityLastPointRef.current = { x: e.clientX, y: e.clientY };
      if (proximityRafRef.current) return;

      proximityRafRef.current = window.requestAnimationFrame(() => {
        proximityRafRef.current = null;
        const btn = loginBtnRef.current;
        const point = proximityLastPointRef.current;
        if (!btn || !point) {
          proximitySmoothedRef.current = 0;
          setProximity(0);
          return;
        }

        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = point.x - cx;
        const dy = point.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const p = Math.max(0, 1 - dist / proximityThresholdPx);
        const prev = proximitySmoothedRef.current;
        const next = prev * 0.75 + p * 0.25;
        proximitySmoothedRef.current = next;

        if (Math.abs(next - prev) > 0.002) setProximity(next);
      });

      if (proximityDecayTimeoutRef.current)
        clearTimeout(proximityDecayTimeoutRef.current);
      proximityDecayTimeoutRef.current = setTimeout(
        () => {
          proximitySmoothedRef.current = 0;
          setProximity(0);
        },
        520
      );
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (proximityRafRef.current)
        cancelAnimationFrame(proximityRafRef.current);
      if (proximityDecayTimeoutRef.current)
        clearTimeout(proximityDecayTimeoutRef.current);
      proximitySmoothedRef.current = 0;
      setProximity(0);
    };
  }, [phase, reducedMotion]);

  useEffect(() => {
    ambientRef.current = new Audio("/sfx/ambient-soft.mp3");
    heartbeatRef.current = new Audio("/sfx/heartbeat-soft.mp3");
    const ambient = ambientRef.current;
    const heartbeat = heartbeatRef.current;

    ambient.loop = heartbeat.loop = true;
    ambient.volume = heartbeat.volume = 0;

    // hanya mulai saat user sudah berinteraksi
    const startAudio = () => {
      if (audioStartedRef.current) return;
      audioStartedRef.current = true;

      ambient.play().catch(() => {});
      heartbeat.play().catch(() => {});

      let vol = 0;
      fadeIntervalRef.current = setInterval(() => {
        vol = Math.min(1, vol + 0.02);
        ambient.volume = Math.min(vol * 0.25, 0.25);
        heartbeat.volume = Math.min(vol * 0.1, 0.1);
        if (vol >= 1 && fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      }, 300);
    };

    const onFirstKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        startAudio();
      }
    };

    window.addEventListener("pointerdown", startAudio, { once: true });
    window.addEventListener("keydown", onFirstKeyDown, { once: true });
    return () => {
      window.removeEventListener("keydown", onFirstKeyDown);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      ambient.pause();
      heartbeat.pause();
    };
  }, []);

  /* ---------------------------------------------------------
     🔐 Login Event Handler
  --------------------------------------------------------- */
  const handleOpenLogin = useCallback(() => {
    playSfx("/sfx/click.mp3", 1);
    setPhase("login");
  }, [playSfx]);

  /* Enter di halaman root = buka form login (sama seperti klik tombol) */
  useEffect(() => {
    if (phase !== "intro") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleOpenLogin();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, handleOpenLogin]);

  const handleLoginFinish = (target?: string) => {
    const url = target || "/dashboard";
    playSfx("/sfx/confirm.mp3", 1);

    if (reducedMotion) {
      router.replace(url);
      return;
    }

    if (accessGrantedRedirectRef.current) {
      clearTimeout(accessGrantedRedirectRef.current);
      accessGrantedRedirectRef.current = null;
    }
    pendingLoginUrlRef.current = url;
    setPhase("accessGranted");
    /* Cukup untuk sampai animasi ACCESS GRANTED terbaca; lalu langsung ganti rute
       (tanpa fase INITIALIZING JARVIS / fadeout). */
    accessGrantedRedirectRef.current = setTimeout(() => {
      accessGrantedRedirectRef.current = null;
      const next = pendingLoginUrlRef.current ?? url;
      pendingLoginUrlRef.current = null;
      router.replace(next);
    }, 920);
  };

  const handleLoginError = () => {
    playSfx("/sfx/denied.mp3", 1);
    setPhase("accessDenied");
    deniedTimeoutRef.current = setTimeout(() => {
      setPhase("login");
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (deniedTimeoutRef.current) clearTimeout(deniedTimeoutRef.current);
      if (accessGrantedRedirectRef.current)
        clearTimeout(accessGrantedRedirectRef.current);

      loginRippleTimeoutsRef.current.forEach((t) => clearTimeout(t));
      loginRippleTimeoutsRef.current.clear();
    };
  }, []);

  /* ---------------------------------------------------------
     ✨ Partikel Deterministik
  --------------------------------------------------------- */
  const particles = useMemo(() => {
    const rand = mulberry32(20251013);
    const count = reducedMotion ? 16 : 40;

    return Array.from({ length: count }, () => ({
      width: rand() * 4.2 + 2.2,
      height: rand() * 4.2 + 2.2,
      top: rand() * 100,
      left: rand() * 100,
      duration: rand() * 5 + 3.5,
      delay: rand() * 3,
    }));
  }, [reducedMotion]);

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
          className="absolute z-[0] w-[1000px] h-[1000px] bg-gradient-to-tr from-blue-600/25 via-purple-600/15 to-pink-600/20 rounded-full blur-[200px]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
          className="absolute z-[0] w-[1200px] h-[1200px] bg-gradient-to-bl from-indigo-700/20 via-fuchsia-600/15 to-blue-700/25 rounded-full blur-[250px]"
        />

        {/* ---- Reactor Core ---- */}
        <motion.div
          animate={{
            rotate: 360,
            scale: reducedMotion ? 1 : [1, 1.05, 1],
            opacity: reducedMotion ? 1 : [0.65, 1, 0.65],
          }}
          transition={
            reducedMotion
              ? { duration: 0.01 }
              : { duration: 10, repeat: Infinity, ease: "easeInOut" }
          }
          className="absolute z-[10] w-[520px] h-[520px] border-[10px] border-t-cyan-400/95 border-r-purple-500/90 border-b-transparent border-l-transparent rounded-full blur-[6px]"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: reducedMotion ? 1 : [1, 1.08, 1],
            opacity: reducedMotion ? 0.9 : [0.55, 0.95, 0.55],
          }}
          transition={
            reducedMotion
              ? { duration: 0.01 }
              : { duration: 14, repeat: Infinity, ease: "easeInOut" }
          }
          className="absolute z-[11] w-[560px] h-[560px] border-[10px] border-b-pink-400/85 border-l-blue-500/85 border-t-transparent border-r-transparent rounded-full blur-[7px]"
        />

        {/* ---- Outer Pulse Ring (lebih sangar) ---- */}
        <motion.div
          animate={
            reducedMotion
              ? { scale: 1, opacity: 1 }
              : { scale: [0.98, 1.02, 0.98], opacity: [0.25, 0.85, 0.25] }
          }
          transition={
            reducedMotion
              ? { duration: 0.01 }
              : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
          }
          className="absolute z-[12] w-[640px] h-[640px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(34,211,238,0.22) 0%, rgba(147,51,234,0.12) 45%, rgba(0,0,0,0) 70%)",
            // bikin hanya "ring" (bukan fill penuh)
            WebkitMaskImage:
              "radial-gradient(circle, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 67%)",
            maskImage:
              "radial-gradient(circle, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 67%)",
            filter:
              "drop-shadow(0 0 18px rgba(59,130,246,0.45)) drop-shadow(0 0 36px rgba(147,51,234,0.22))",
          }}
        />

        {/* ---- CRT / Scanlines (localized to reactor) ---- */}
        <motion.div
          aria-hidden="true"
          className="absolute z-[13] w-[560px] h-[560px] rounded-full pointer-events-none"
          style={{
            background:
              "repeating-linear-gradient(to bottom, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 2px)",
            WebkitMaskImage:
              "radial-gradient(circle, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 72%)",
            maskImage:
              "radial-gradient(circle, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 72%)",
            mixBlendMode: "overlay",
          }}
          animate={
            reducedMotion
              ? { opacity: 0.18 }
              : { opacity: [0.12, 0.28, 0.16], y: [0, -8, 0] }
          }
          transition={
            reducedMotion
              ? { duration: 0.01 }
              : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
          }
        />

        {/* ---- Chromatic split (subtle) ---- */}
        {!reducedMotion && (
          <>
            <motion.div
              aria-hidden="true"
              className="absolute z-[14] w-[560px] h-[560px] rounded-full pointer-events-none"
              style={{
                background:
                  "repeating-linear-gradient(to bottom, rgba(34,211,238,0.14) 0px, rgba(34,211,238,0.14) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 2px)",
                WebkitMaskImage:
                  "radial-gradient(circle, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 72%)",
                maskImage:
                  "radial-gradient(circle, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 72%)",
                mixBlendMode: "screen",
                filter: "blur(0.2px)",
              }}
              animate={{ x: [-1, 1, -1], opacity: [0.08, 0.16, 0.1] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute z-[14] w-[560px] h-[560px] rounded-full pointer-events-none"
              style={{
                background:
                  "repeating-linear-gradient(to bottom, rgba(244,114,182,0.14) 0px, rgba(244,114,182,0.14) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 2px)",
                WebkitMaskImage:
                  "radial-gradient(circle, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 72%)",
                maskImage:
                  "radial-gradient(circle, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 72%)",
                mixBlendMode: "screen",
                filter: "blur(0.2px)",
              }}
              animate={{ x: [1, -1, 1], opacity: [0.08, 0.14, 0.1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        {/* ---- Grain / Noise (localized CRT texture) ---- */}
        <motion.div
          aria-hidden="true"
          className="absolute z-[15] w-[560px] h-[560px] rounded-full pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.24) 1px, rgba(0,0,0,0) 1.5px)",
            backgroundSize: "3px 3px",
            backgroundPosition: "0px 0px",
            mixBlendMode: "overlay",
            filter: "blur(0.2px)",
            WebkitMaskImage:
              "radial-gradient(circle, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 72%)",
            maskImage:
              "radial-gradient(circle, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 72%)",
          }}
          animate={
            reducedMotion
              ? { opacity: 0.12 }
              : {
                  opacity: [0.06, 0.12, 0.07],
                  x: [0, 1, -1, 0],
                  y: [0, -1, 1, 0],
                }
          }
          transition={
            reducedMotion ? { duration: 0.01 } : { duration: 2.1, repeat: Infinity, ease: "easeInOut" }
          }
        />

        {/* ---- Core Glow ---- */}
        <motion.div
          className="absolute z-[16] w-[190px] h-[190px] bg-[radial-gradient(circle,rgba(59,130,246,0.55),transparent_70%)] rounded-full blur-2xl"
          animate={
            reducedMotion
              ? { scale: 1, opacity: 0.9 }
              : { scale: [0.9, 1.12, 0.9], opacity: [0.45, 0.9, 0.45] }
          }
          transition={
            reducedMotion
              ? { duration: 0.01 }
              : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          }
        />

        {/* ---- Partikel ---- */}
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute z-[17] rounded-full"
            style={{
              width: p.width * 1.25,
              height: p.height * 1.25,
              top: `${p.top}%`,
              left: `${p.left}%`,
              background:
                "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0) 70%)",
              boxShadow:
                "0 0 10px rgba(59,130,246,0.35), 0 0 22px rgba(147,51,234,0.22)",
            }}
            animate={{
              y: reducedMotion ? 0 : [0, -36, 0],
              opacity: reducedMotion ? 0.75 : [0.35, 0.98, 0.35],
              scale: reducedMotion ? 1 : [1, 1.45, 1],
            }}
            transition={{
              duration: reducedMotion ? 0.01 : p.duration,
              repeat: reducedMotion ? 0 : Infinity,
              delay: reducedMotion ? 0 : p.delay,
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
            animate={reducedMotion ? { opacity: 1 } : { opacity: [0, 1, 0] }}
            transition={
              reducedMotion
                ? { duration: 0.01 }
                : { duration: 0.8, repeat: Infinity }
            }
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
            {/* proximity pulse behind button */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-3 rounded-full blur-[14px]"
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, rgba(34,211,238,0.35) 0%, rgba(147,51,234,0.18) 45%, rgba(0,0,0,0) 70%)",
                opacity: proximity,
                mixBlendMode: "screen",
              }}
              animate={{ scale: 1 + proximity * 0.12 }}
            />

            <motion.button
              ref={loginBtnRef}
              onClick={handleOpenLogin}
              aria-label="Login ke Sistem"
              onPointerEnter={(e) =>
                handleLoginRippleFromEvent(e, "hover")
              }
              onPointerDown={(e) =>
                handleLoginRippleFromEvent(e, "click")
              }
              whileHover={
                reducedMotion
                  ? { scale: 1.02 }
                  : {
                      scale: 1.06,
                      rotate: [0, -0.8, 0.8, -0.5, 0.5, 0],
                      transition: {
                        rotate: {
                          duration: 0.55,
                          repeat: Infinity,
                          repeatType: "mirror",
                          ease: "easeInOut",
                        },
                      },
                    }
              }
              whileTap={{ scale: 0.96 }}
              animate={
                reducedMotion
                  ? { boxShadow: "0 0 18px rgba(59,130,246,0.5)" }
                  : {
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      boxShadow: [
                        "0 0 18px rgba(59,130,246,0.45)",
                        "0 0 32px rgba(147,51,234,0.42)",
                        "0 0 18px rgba(59,130,246,0.45)",
                      ],
                    }
              }
              transition={
                reducedMotion
                  ? { duration: 0.01 }
                  : { duration: 7, repeat: Infinity, ease: "easeInOut" }
              }
              className="relative overflow-hidden px-10 py-4 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-[length:200%_200%] text-white font-bold uppercase tracking-widest shadow-[0_0_25px_rgba(59,130,246,0.35)] ring-1 ring-white/10 backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 will-change-transform"
            >
              {/* soft inner bloom */}
              <span
                aria-hidden="true"
                className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.28)_0%,transparent_55%)]"
              />

              {/* proximity artifact overlay */}
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 z-[2] rounded-full pointer-events-none mix-blend-overlay"
                style={{
                  opacity: Math.min(0.85, proximity * 0.85),
                  background:
                    "repeating-linear-gradient(to bottom, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 6px)",
                  filter: "blur(0.15px) saturate(1.15)",
                }}
                animate={{ y: -3 * proximity, x: 2.5 * proximity }}
              />

              {/* click/hover ripple */}
              <AnimatePresence initial={false}>
                {loginRipples.map((r) => (
                  <motion.span
                    key={r.id}
                    aria-hidden="true"
                    className="absolute z-[1] rounded-full pointer-events-none bg-white/30 mix-blend-screen"
                    style={{
                      left: r.x,
                      top: r.y,
                      width: r.size,
                      height: r.size,
                      transform: "translate(-50%, -50%)",
                    }}
                    initial={{ opacity: 0, scale: 0.25 }}
                    animate={{ opacity: 0.55, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.15 }}
                    transition={{ duration: 0.75, ease: "easeOut" }}
                  />
                ))}
              </AnimatePresence>

              {/* hover shine sweep */}
              <motion.span
                aria-hidden="true"
                className="absolute z-[2] top-1/2 h-[170%] w-[70%] -translate-y-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/45 to-transparent blur-[0.5px]"
                initial={{ opacity: 0, x: "-60%" }}
                whileHover={
                  reducedMotion
                    ? { opacity: 0 }
                    : {
                        opacity: 0.85,
                        x: "140%",
                        transition: { duration: 0.9, ease: "easeInOut" },
                      }
                }
                // whileHover transition in Framer isn't always honored for all props,
                // so we also provide a safe default transition:
                transition={{ duration: 0.9, ease: "easeInOut" }}
              />

              {/* text */}
              <span className="relative z-10 flex items-center justify-center gap-3">
                <motion.span
                  aria-hidden="true"
                  className="relative"
                  animate={
                    reducedMotion
                      ? { opacity: 1 }
                      : {
                          opacity: [0.92, 1, 0.96],
                          y: [-0.5 * proximity, 0, -0.25 * proximity],
                        }
                  }
                  transition={{
                    duration: reducedMotion ? 0.01 : 1.6,
                    repeat: reducedMotion ? 0 : Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    filter:
                      proximity > 0.2
                        ? `drop-shadow(0 0 ${8 * proximity}px rgba(34,211,238,0.55))`
                        : undefined,
                  }}
                >
                  🔐
                </motion.span>

                <motion.span
                  className="relative font-mono font-semibold uppercase tracking-[0.32em] text-white/95"
                  style={{
                    textShadow:
                      proximity > 0
                        ? `1px 0 rgba(34,211,238,${0.32 * proximity}), -1px 0 rgba(244,114,182,${0.22 * proximity})`
                        : undefined,
                    letterSpacing: "0.32em",
                  }}
                  animate={
                    reducedMotion
                      ? { opacity: 1 }
                      : {
                          opacity: [0.92, 1, 0.96],
                          x:
                            proximity > 0.55
                              ? [0, -0.35, 0.35, 0]
                              : [0, -0.15 * proximity, 0.15 * proximity, 0],
                        }
                  }
                  transition={{
                    duration: reducedMotion ? 0.01 : 1.9,
                    repeat: reducedMotion ? 0 : Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="mr-2 text-cyan-100/70"
                    style={{ filter: proximity > 0.4 ? "contrast(1.15)" : undefined }}
                  >
                    ⟦
                  </span>
                  <span className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-2 top-1/2 h-[10px] w-[10px] -translate-y-1/2 border-l border-t border-white/25"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -right-2 top-1/2 h-[10px] w-[10px] -translate-y-1/2 border-r border-b border-white/25"
                    />
                    <span>Login ke Sistem</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-2 text-pink-100/60"
                    style={{ filter: proximity > 0.4 ? "contrast(1.15)" : undefined }}
                  >
                    ⟧
                  </span>
                </motion.span>
              </span>
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

        {/* ---- Access Granted (tanpa fase Jarvis / fadeout berikutnya) ---- */}
        {phase === "accessGranted" && (
          <motion.div
            key="access-granted"
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex items-center justify-center bg-black bg-[radial-gradient(circle,rgba(34,211,238,0.18)_0%,rgba(0,0,0,0)_65%)] z-[9999]"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              y: reducedMotion ? 0 : [6, 0, -1, 0],
            }}
            transition={{ duration: reducedMotion ? 0.01 : 0.35 }}
          >
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={false}
              animate={
                reducedMotion
                  ? { scale: 1, opacity: 1 }
                  : { scale: [0.98, 1.02, 1], opacity: 1 }
              }
              transition={{ duration: reducedMotion ? 0.01 : 0.6 }}
            >
              <motion.h2
                className="text-5xl font-extrabold text-emerald-300 tracking-widest"
                animate={
                  reducedMotion ? { opacity: 1 } : { opacity: [0.6, 1, 0.85] }
                }
                transition={{ duration: reducedMotion ? 0.01 : 0.35 }}
              >
                ACCESS GRANTED
              </motion.h2>
              <motion.p
                className="text-sm md:text-base text-slate-300 tracking-widest"
                initial={{ opacity: 0 }}
                animate={
                  reducedMotion
                    ? { opacity: 0.85 }
                    : { opacity: [0, 1, 0.75] }
                }
                transition={{
                  duration: reducedMotion ? 0.01 : 0.8,
                  delay: 0.08,
                }}
              >
                SELAMAT DATANG KEMBALI.
              </motion.p>
            </motion.div>
          </motion.div>
        )}

        {/* ---- Access Denied ---- */}
        {phase === "accessDenied" && (
          <motion.div
            key="access-denied"
            role="alert"
            aria-live="assertive"
            className="absolute inset-0 flex items-center justify-center bg-black bg-[repeating-linear-gradient(0deg,rgba(255,0,64,0.05)_0px,rgba(255,0,64,0.05)_1px,transparent_1px,transparent_2px)] z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.25 }}
          >
            <motion.h2
              className="text-5xl font-extrabold text-rose-400 tracking-widest"
              animate={reducedMotion ? { opacity: 1 } : { x: [0, -4, 4, 0] }}
              transition={
                reducedMotion ? { duration: 0.01 } : { duration: 0.8 }
              }
            >
              ACCESS DENIED
            </motion.h2>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

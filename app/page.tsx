"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import CinematicIntro from "@/components/ui/CinematicIntro";
import LoginModal from "@/components/LoginModal";
import JarvisLoader from "@/components/JarvisLoader";

export default function Home() {
  const router = useRouter();

  // 🎬 Tahapan visual
  const [phase, setPhase] = useState<"intro" | "login" | "boot" | "done">(
    "intro"
  );

  // Setelah intro selesai → tampilkan login
  useEffect(() => {
    if (phase === "intro") return;
    if (phase === "toLogin") {
      const timer = setTimeout(() => setPhase("login"), 600);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Setelah boot animasi selesai → redirect dashboard
  useEffect(() => {
    if (phase === "boot") {
      const timer = setTimeout(() => {
        setPhase("done");
        router.push("/dashboard");
      }, 4800);
      return () => clearTimeout(timer);
    }
  }, [phase, router]);

  return (
    <main className="relative h-screen flex items-center justify-center overflow-hidden bg-black text-white">
      <AnimatePresence mode="wait">
        {/* 🎬 Cinematic Intro */}
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
          >
            <CinematicIntro onFinish={() => setPhase("login")} />
          </motion.div>
        )}

        {/* 🔐 Modal Login */}
        {phase === "login" && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <LoginModal
              onClose={() => setPhase("intro")}
              onSuccess={() => setPhase("boot")}
            />
          </motion.div>
        )}

        {/* 🌀 Booting JARVIS */}
        {phase === "boot" && (
          <motion.div
            key="loader"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <JarvisLoader mode="full" autoRedirect={false} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

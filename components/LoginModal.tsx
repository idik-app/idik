"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import JarvisLoader from "@/components/JarvisLoader";

interface LoginModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  onError?: () => void;
}

export default function LoginModal({
  onClose,
  onSuccess,
  onError,
}: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showBootAnim, setShowBootAnim] = useState(false);
  const [shake, setShake] = useState(false);

  const searchParams = useSearchParams();
  const redirectFrom = searchParams.get("from") || "/dashboard";

  /* ============================================================
     🔐 Fungsi Login Lokal (JWT Cookie)
  ============================================================ */
  const handleLogin = async () => {
    setError("");

    if (!username || !password) {
      setError("Mohon isi username dan password.");
      playErrorSound();
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include", // ✅ penting agar cookie tersimpan
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        // 🔊 Suara sukses
        const confirmSound = new Audio("/sfx/confirm.mp3");
        confirmSound.volume = 0.3;
        confirmSound.play().catch(() => {});

        onClose();
        setShowBootAnim(true);

        setTimeout(() => {
          setShowBootAnim(false);
          const redirectTarget = redirectFrom || data.redirect || "/dashboard";
          window.location.href = redirectTarget;
        }, 4800);

        if (onSuccess) onSuccess();
      } else {
        setError(data.message || "Username atau password salah.");
        playErrorSound();
        triggerShake();
        if (onError) onError();
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Terjadi kesalahan koneksi. Coba lagi.");
      playErrorSound();
      triggerShake();
      if (onError) onError();
    } finally {
      setLoading(false);
    }
  };

  /* 🔊 Suara error */
  const playErrorSound = () => {
    const errorSound = new Audio("/sfx/error.mp3");
    errorSound.volume = 0.4;
    errorSound.play().catch(() => {});
  };

  /* 💢 Efek shake */
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  return (
    <>
      {/* 🌀 Boot Animation */}
      <AnimatePresence>
        {showBootAnim && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            <JarvisLoader mode="full" autoRedirect={false} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔹 Modal Login */}
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className={`relative w-[90%] max-w-md rounded-2xl border border-white/20 bg-white/10 dark:bg-slate-800/30 p-8 text-white shadow-[0_0_30px_rgba(0,224,255,0.2)] ${
            shake ? "animate-shake" : ""
          }`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5 }}
        >
          {/* Tombol X */}
          <button
            onClick={onClose}
            className="absolute top-3 right-4 text-gray-300 hover:text-cyan-400 transition-transform hover:rotate-90"
          >
            ✕
          </button>

          {/* Header */}
          <h2 className="text-center text-2xl font-semibold mb-6 text-cyan-300">
            Akses Sistem IDIK-App
          </h2>

          {/* Username */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2 focus:ring-2 focus:ring-cyan-400 outline-none placeholder-gray-400"
              placeholder="Masukkan username"
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2 focus:ring-2 focus:ring-cyan-400 outline-none placeholder-gray-400"
              placeholder="Masukkan password"
              disabled={loading}
            />
          </div>

          {/* Pesan Error */}
          {error && (
            <motion.p
              className="mb-4 text-center text-sm text-red-400 bg-red-900/30 p-2 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}

          {/* Tombol Login */}
          <motion.button
            onClick={handleLogin}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={loading}
            className={`w-full rounded-lg py-2 font-semibold text-white shadow-lg transition-all duration-300 ${
              loading
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-[0_0_20px_rgba(0,255,255,0.5)]"
            }`}
          >
            {loading ? "Memproses..." : "Masuk"}
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  );
}

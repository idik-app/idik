"use client";

import { motion } from "framer-motion";
import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";

interface LoginModalProps {
  onClose: () => void;
  /** Dipanggil saat login berhasil; target = URL redirect sesuai role (dari API). */
  onSuccess?: (target?: string) => void;
  onError?: () => void;
}

export default function LoginModal({
  onClose,
  onSuccess,
  onError,
}: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const didFocusUsername = useRef(false);

  const isMobile = useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(max-width: 639px)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(max-width: 639px)").matches,
    () => false
  );

  /* Fokus ke username hanya sekali saat modal pertama kali terbuka */
  useEffect(() => {
    if (didFocusUsername.current) return;
    const t = setTimeout(() => {
      if (usernameInputRef.current) {
        usernameInputRef.current.focus();
        didFocusUsername.current = true;
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

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

    const proto =
      typeof window !== "undefined" ? window.location.protocol : "http:";
    if (!/^https?:$/i.test(proto)) {
      setError(
        "Buka aplikasi lewat browser dari server Next.js (mis. http://localhost:3000 setelah npm run dev). Jangan membuka file .html secara langsung."
      );
      playErrorSound();
      triggerShake();
      if (onError) onError();
      return;
    }

    /* Selalu same-origin agar cookie `session` terikat ke host yang sama dengan
       bilah alamat (hindari localhost vs 127.0.0.1 / salah NEXT_PUBLIC_APP_URL). */
    const authUrl = "/api/auth";

    setLoading(true);
    try {
      const res = await fetch(authUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
        credentials: "include", // simpan cookie JWT
      });

      let data: { ok?: boolean; message?: string; target?: string } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.ok && data.ok) {
        const confirmSound = new Audio("/sfx/confirm.mp3");
        confirmSound.volume = 0.3;
        confirmSound.play().catch(() => {});

        const target = typeof data.target === "string" ? data.target : undefined;
        /* Jangan panggil onClose() di sini: onClose di parent meng-set phase "intro"
           (beranda) sehingga sesaat terlihat root sebelum onSuccess jalan. */
        if (onSuccess) onSuccess(target);
      } else {
        /* Jangan panggil onError untuk 4xx auth: parent (CinematicIntro) menampilkan
           layar "ACCESS DENIED" — itu membingungkan untuk salah password biasa. */
        setError(data.message || "Username atau password salah.");
        playErrorSound();
        triggerShake();
      }
    } catch (err) {
      console.error("Login error:", err);
      const isNetworkFail =
        err instanceof TypeError &&
        (err.message === "Failed to fetch" ||
          err.message.toLowerCase().includes("fetch") ||
          err.message.toLowerCase().includes("network"));
      setError(
        isNetworkFail
          ? "Tidak terhubung ke server. Pastikan `npm run dev` atau `npm start` berjalan, lalu buka URL yang sama di bilah alamat (contoh http://localhost:3000). Periksa firewall atau port."
          : "Terjadi kesalahan koneksi. Coba lagi."
      );
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  const overlayTransition = { duration: isMobile ? 0.18 : 0.4 };
  const panelTransition = { duration: isMobile ? 0.22 : 0.5 };

  return (
    <>
      {/* 🔹 Modal Login — max-sm: tampilan ringan (kurang blur/shadow, layout rapat) */}
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm sm:bg-black/40 sm:backdrop-blur-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={overlayTransition}
      >
        <motion.div
          className={`relative w-[94%] max-w-md rounded-xl border border-white/15 bg-white/10 p-4 text-white shadow-none dark:bg-slate-800/30 sm:w-[90%] sm:rounded-2xl sm:border-white/20 sm:p-8 sm:shadow-[0_0_30px_rgba(0,224,255,0.2)] ${
            shake ? "animate-shake" : ""
          }`}
          initial={
            isMobile
              ? { opacity: 0, y: 8 }
              : { opacity: 0, scale: 0.9 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={
            isMobile
              ? { opacity: 0, y: 6 }
              : { opacity: 0, scale: 1.05 }
          }
          transition={panelTransition}
        >
          {/* Tombol X */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-300 hover:text-cyan-400 active:bg-white/10 sm:top-3 sm:right-4 sm:min-h-0 sm:min-w-0 sm:p-0 transition-transform sm:hover:rotate-90"
          >
            ✕
          </button>

          {/* Header */}
          <h2 className="text-center text-lg font-semibold mb-4 text-cyan-300 sm:text-2xl sm:mb-6">
            Akses Sistem IDIK-App
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs text-gray-300 mb-1 sm:text-sm">
                Username
              </label>
              <input
                ref={usernameInputRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-[15px] focus:ring-2 focus:ring-cyan-400 outline-none placeholder-gray-400 sm:px-4 sm:py-2 sm:text-base"
                placeholder="Masukkan username"
                disabled={loading}
                autoComplete="username"
              />
            </div>

            {/* Password + toggle show/hide */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs text-gray-300 mb-1 sm:text-sm">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 pr-11 text-[15px] focus:ring-2 focus:ring-cyan-400 outline-none placeholder-gray-400 sm:px-4 sm:py-2 sm:text-base"
                  placeholder="Masukkan password"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-gray-400 hover:text-cyan-400 hover:bg-white/10 active:bg-white/15 sm:right-2 sm:min-h-0 sm:min-w-0 sm:p-1.5 transition-colors"
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" aria-hidden />
                  ) : (
                    <Eye className="w-5 h-5" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {/* Pesan Error */}
            {error && (
              <motion.p
                className="mb-3 text-center text-xs leading-snug text-red-400 bg-red-900/30 p-2 rounded-lg sm:mb-4 sm:text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: isMobile ? 0.12 : 0.2 }}
              >
                {error}
              </motion.p>
            )}

            {/* Tombol Login (submit form = Enter juga trigger) */}
            <motion.button
              type="submit"
              whileHover={isMobile ? undefined : { scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className={`w-full rounded-lg py-3 text-[15px] font-semibold text-white shadow-md transition-all duration-300 sm:py-2 sm:text-base sm:shadow-lg ${
                loading
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-600 to-blue-600 active:opacity-95 sm:hover:shadow-[0_0_20px_rgba(0,255,255,0.5)]"
              }`}
            >
              {loading ? "Memproses..." : "Masuk"}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </>
  );
}

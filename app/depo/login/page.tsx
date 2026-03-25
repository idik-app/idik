"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useState } from "react";

function DepoLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!username.trim() || !password) {
        setError("Mohon isi username dan password.");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
          credentials: "include",
        });

        let data: { ok?: boolean; message?: string; target?: string } = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (res.ok && data.ok) {
          const target =
            typeof data.target === "string" && data.target.startsWith("/")
              ? data.target
              : "/depo/dashboard";
          window.location.href = target;
          return;
        }

        setError(data.message || "Username atau password salah.");
      } catch {
        setError("Tidak terhubung ke server. Coba lagi.");
      } finally {
        setLoading(false);
      }
    },
    [username, password]
  );

  const inputClass =
    "w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-base text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400 outline-none";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-[#020617] via-[#04120c] to-[#020617]">
      <div className="w-full max-w-md rounded-2xl border border-emerald-800/40 bg-slate-950/70 p-6 shadow-[0_0_40px_rgba(16,185,129,0.12)]">
        <div className="text-center mb-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white mb-1">
            IDIK-App
          </p>
          <h1 className="text-xl font-semibold text-white">
            Login Depo Farmasi
          </h1>
          <p className="text-[12px] text-white mt-2">
            Masuk untuk mengelola stok, validasi resep, dan laporan farmasi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              placeholder="Username akun RS"
              disabled={loading}
              autoComplete="username"
              autoCapitalize="none"
            />
          </div>
          <div>
            <label className="block text-xs text-white mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-11`}
                placeholder="Password"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/80 hover:text-white"
                title={showPassword ? "Sembunyikan" : "Tampilkan"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <p className="text-center text-xs text-red-300 bg-red-950/50 border border-red-900/50 rounded-lg py-2 px-2">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg py-3 text-sm font-semibold text-white transition ${
              loading
                ? "bg-emerald-900/50 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/40"
            }`}
          >
            {loading ? "Memproses…" : "Masuk ke Depo"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-white">
          <Link href="/" className="underline hover:text-white/90">
            Kembali ke beranda
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function DepoLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white text-sm">
          Memuat…
        </div>
      }
    >
      <DepoLoginForm />
    </Suspense>
  );
}

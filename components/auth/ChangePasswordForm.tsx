"use client";

import { useState } from "react";

type Variant = "depo" | "distributor";

const styles: Record<
  Variant,
  {
    title: string;
    label: string;
    input: string;
    button: string;
    ok: string;
    err: string;
  }
> = {
  depo: {
    title: "text-sm font-semibold text-white",
    label: "block text-xs text-white/90 mb-1",
    input:
      "w-full rounded-lg border border-emerald-800/60 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/80",
    button:
      "px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-800/80 border border-emerald-600/60 hover:bg-emerald-700/80 disabled:opacity-50 disabled:pointer-events-none",
    ok: "text-[12px] text-emerald-300",
    err: "text-[12px] text-rose-300",
  },
  distributor: {
    title: "text-[13px] font-semibold text-[#D4AF37]",
    label: "block text-[11px] text-cyan-300/80 mb-1",
    input:
      "w-full rounded-lg border border-cyan-900/60 bg-slate-950/70 px-3 py-2 text-[12px] text-cyan-100 placeholder:text-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-400",
    button:
      "px-4 py-2 rounded-xl text-[12px] font-medium bg-cyan-500/20 border border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50 disabled:pointer-events-none",
    ok: "text-[11px] text-emerald-400/95",
    err: "text-[11px] text-rose-300",
  },
};

export default function ChangePasswordForm({
  variant = "depo",
}: {
  variant?: Variant;
}) {
  const s = styles[variant];
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (newPassword !== confirmPassword) {
      setMsg({ type: "err", text: "Konfirmasi password tidak sama." });
      return;
    }
    if (newPassword.length < 6) {
      setMsg({ type: "err", text: "Password baru minimal 6 karakter." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !j?.ok) {
        setMsg({
          type: "err",
          text: j?.message ?? "Gagal mengubah password.",
        });
        return;
      }
      setMsg({ type: "ok", text: j.message ?? "Password berhasil diubah." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMsg({ type: "err", text: "Tidak terhubung ke server." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h2 className={s.title}>Ganti password</h2>
      <p
        className={
          variant === "depo"
            ? "text-[11px] text-white/70"
            : "text-[11px] text-cyan-300/65"
        }
      >
        Masukkan password lama, lalu password baru (minimal 6 karakter).
      </p>

      {msg ? (
        <p className={msg.type === "ok" ? s.ok : s.err}>{msg.text}</p>
      ) : null}

      <div>
        <label className={s.label}>Password saat ini</label>
        <input
          type="password"
          className={s.input}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          disabled={loading}
        />
      </div>
      <div>
        <label className={s.label}>Password baru</label>
        <input
          type="password"
          className={s.input}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          disabled={loading}
        />
      </div>
      <div>
        <label className={s.label}>Ulangi password baru</label>
        <input
          type="password"
          className={s.input}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          disabled={loading}
        />
      </div>

      <div className="pt-1">
        <button type="submit" disabled={loading} className={s.button}>
          {loading ? "Menyimpan…" : "Simpan password baru"}
        </button>
      </div>
    </form>
  );
}

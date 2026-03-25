"use client";

import { useEffect, useState } from "react";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";

type MeResponse =
  | { ok: true; username: string; role: string }
  | { ok: false; message?: string };

export default function DepoProfilPage() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j: MeResponse) => {
        if (!alive) return;
        setMe(j);
      })
      .catch(() => {
        if (!alive) return;
        setMe({ ok: false, message: "Gagal memuat profil." });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!me) {
    return (
      <div className="p-4 md:p-5 text-sm text-white/80">Memuat profil…</div>
    );
  }

  if (!me.ok) {
    return (
      <div className="p-4 md:p-5 text-sm text-rose-300">
        {me.message ?? "Tidak dapat memuat profil."}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5 space-y-8 max-w-lg">
      <div>
        <h1 className="text-lg font-semibold text-white">Profil</h1>
        <p className="text-[12px] text-white/75 mt-1">
          Informasi akun login portal Depo Farmasi.
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-900/50 bg-slate-950/50 p-4 space-y-2">
        <div className="text-[11px] text-white/60 uppercase tracking-wide">
          Username
        </div>
        <div className="text-sm font-medium text-white">{me.username}</div>
        <div className="text-[11px] text-white/60 uppercase tracking-wide pt-3">
          Role
        </div>
        <div className="text-sm font-medium text-white">{me.role}</div>
      </div>

      <div className="rounded-2xl border border-emerald-900/50 bg-slate-950/40 p-4">
        <ChangePasswordForm variant="depo" />
      </div>
    </div>
  );
}

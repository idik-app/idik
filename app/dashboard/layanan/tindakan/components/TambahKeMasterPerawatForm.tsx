"use client";

import { useState } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";

type Props = {
  onAdded?: () => void;
};

export default function TambahKeMasterPerawatForm({ onAdded }: Props) {
  const { show } = useNotification();
  const [nama, setNama] = useState("");
  const [bidang, setBidang] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const n = nama.trim().replace(/\s+/g, " ");
    if (!n) {
      show({ type: "error", message: "Isi nama perawat." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/master-perawat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_perawat: n,
          bidang: bidang.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      show({ type: "success", message: "Perawat ditambahkan ke master." });
      setNama("");
      setBidang("");
      onAdded?.();
    } catch (e) {
      show({
        type: "error",
        message: `Gagal menambah master: ${(e as Error).message}`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-cyan-800/45 bg-black/20 px-3 py-3">
      <p className="text-[11px] font-medium text-cyan-500/90">
        Tambah ke master perawat
      </p>
      <p className="mt-0.5 text-[10px] text-gray-500">
        Nama akan muncul di pilihan Asisten, Sirkuler, dan Logger.
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Nama perawat</span>
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Nama lengkap"
            disabled={busy}
            className="w-full rounded-md border border-cyan-900/50 bg-black/40 px-2 py-1.5 text-sm text-cyan-100 placeholder:text-cyan-600/50 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50"
          />
        </label>
        <label className="min-w-0 flex-1 sm:max-w-[12rem]">
          <span className="sr-only">Bidang (opsional)</span>
          <input
            value={bidang}
            onChange={(e) => setBidang(e.target.value)}
            placeholder="Bidang (opsional)"
            disabled={busy}
            className="w-full rounded-md border border-cyan-900/50 bg-black/40 px-2 py-1.5 text-sm text-cyan-100 placeholder:text-cyan-600/50 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="shrink-0 rounded-md border border-cyan-600/40 bg-cyan-950/50 px-3 py-1.5 text-[11px] font-medium text-cyan-100 hover:bg-cyan-900/40 disabled:opacity-50"
        >
          {busy ? "Menyimpan…" : "Tambah"}
        </button>
      </div>
    </div>
  );
}

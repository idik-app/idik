"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Settings = {
  email_recipients: string[];
  realtime_enabled: boolean;
  realtime_aggregate_minutes: number;
  low_stock_enabled: boolean;
  daily_digest_enabled: boolean;
  daily_digest_time: string;
  weekly_digest_enabled: boolean;
  weekly_digest_day: number;
  weekly_digest_time: string;
};

function DistributorNotifikasiPageContent() {
  const searchParams = useSearchParams();
  const distributorIdParam = searchParams.get("distributor_id") ?? "";

  const [s, setS] = useState<Settings | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const q = distributorIdParam
      ? `?distributor_id=${encodeURIComponent(distributorIdParam)}`
      : "";
    setErrorMsg(null);
    const res = await fetch(`/api/distributor/notifikasi/settings${q}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || json?.ok === false) {
      setS(null);
      setErrorMsg(json?.message ?? "Gagal memuat pengaturan");
      return;
    }
    setS(json?.data ?? null);
  };

  useEffect(() => {
    load();
  }, [distributorIdParam]);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    try {
      await fetch("/api/distributor/notifikasi/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!s) {
    if (errorMsg) {
      return (
        <div className="space-y-2">
          <div className="text-[12px] text-rose-300">{errorMsg}</div>
          <div className="text-[12px] text-cyan-300/70">
            Untuk mode administrator, pilih distributor dulu dari dropdown.
          </div>
        </div>
      );
    }
    return <div className="text-[12px] text-cyan-300/70">Memuat pengaturan…</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-[#D4AF37]">Notifikasi (Cathlab)</h1>
        <p className="text-[12px] text-cyan-300/70">
          Kanal WhatsApp opsional nanti. Untuk sekarang email.
        </p>
      </div>

      <section className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-4 space-y-3">
        <div className="text-[12px] font-semibold text-cyan-100">Email penerima</div>
        <div className="flex flex-wrap gap-2">
          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="tambah email (enter)"
            className="w-64 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const v = emailInput.trim();
              if (!v) return;
              setS((prev) =>
                prev
                  ? {
                      ...prev,
                      email_recipients: Array.from(new Set([...prev.email_recipients, v])),
                    }
                  : prev
              );
              setEmailInput("");
            }}
          />
          {s.email_recipients.map((em) => (
            <button
              key={em}
              onClick={() =>
                setS((prev) =>
                  prev
                    ? { ...prev, email_recipients: prev.email_recipients.filter((x) => x !== em) }
                    : prev
                )
              }
              className="px-2 py-1 rounded-full text-[11px] border border-cyan-800/70 bg-slate-950/60 hover:bg-slate-900"
              title="Klik untuk hapus"
            >
              {em}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-4 space-y-3">
        <div className="text-[12px] font-semibold text-cyan-100">Jenis notifikasi</div>
        <Toggle
          label="Real-time pemakaian (ringkas)"
          value={s.realtime_enabled}
          onChange={(v) => setS({ ...s, realtime_enabled: v })}
        />
        <div className="flex items-center gap-2 text-[12px] text-cyan-300/70">
          <span>Digabung per</span>
          <input
            type="number"
            min={1}
            value={s.realtime_aggregate_minutes}
            onChange={(e) => setS({ ...s, realtime_aggregate_minutes: Number(e.target.value) })}
            className="w-20 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1"
          />
          <span>menit</span>
        </div>

        <Toggle
          label="Stok menipis"
          value={s.low_stock_enabled}
          onChange={(v) => setS({ ...s, low_stock_enabled: v })}
        />

        <Toggle
          label="Rekap harian"
          value={s.daily_digest_enabled}
          onChange={(v) => setS({ ...s, daily_digest_enabled: v })}
        />
        <div className="flex items-center gap-2 text-[12px] text-cyan-300/70">
          <span>Jam</span>
          <input
            value={s.daily_digest_time}
            onChange={(e) => setS({ ...s, daily_digest_time: e.target.value })}
            className="w-24 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1"
            placeholder="18:00"
          />
          <span>WIB</span>
        </div>

        <Toggle
          label="Rekap mingguan"
          value={s.weekly_digest_enabled}
          onChange={(v) => setS({ ...s, weekly_digest_enabled: v })}
        />
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-cyan-300/70">
          <span>Hari</span>
          <select
            value={s.weekly_digest_day}
            onChange={(e) => setS({ ...s, weekly_digest_day: Number(e.target.value) })}
            className="bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1"
          >
            <option value={1}>Senin</option>
            <option value={2}>Selasa</option>
            <option value={3}>Rabu</option>
            <option value={4}>Kamis</option>
            <option value={5}>Jumat</option>
            <option value={6}>Sabtu</option>
            <option value={7}>Minggu</option>
          </select>
          <span>Jam</span>
          <input
            value={s.weekly_digest_time}
            onChange={(e) => setS({ ...s, weekly_digest_time: e.target.value })}
            className="w-24 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1"
            placeholder="08:00"
          />
          <span>WIB</span>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-full text-[12px] font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 text-black disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}

export default function DistributorNotifikasiPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-cyan-500/80 text-sm">
          Memuat notifikasi…
        </div>
      }
    >
      <DistributorNotifikasiPageContent />
    </Suspense>
  );
}

function Toggle(props: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-[12px]">
      <span className="text-cyan-200">{props.label}</span>
      <input
        type="checkbox"
        checked={props.value}
        onChange={(e) => props.onChange(e.target.checked)}
        className="h-4 w-4 accent-cyan-400"
      />
    </label>
  );
}


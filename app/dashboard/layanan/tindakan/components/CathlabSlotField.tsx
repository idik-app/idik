"use client";

import { useEffect, useState } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";

const CATHLAB_NOMOR = ["1", "2", "3"] as const;

type Props = {
  tindakanId: string;
  value: string | null | undefined;
  onSaved?: () => void;
};

function normalizeDraft(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return CATHLAB_NOMOR.includes(s as (typeof CATHLAB_NOMOR)[number]) ? s : "";
}

export default function CathlabSlotField({
  tindakanId,
  value,
  onSaved,
}: Props) {
  const { show } = useNotification();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(() => normalizeDraft(value));

  useEffect(() => {
    setDraft(normalizeDraft(value));
  }, [value, tindakanId]);

  const persist = async (next: string) => {
    const picked = next.trim();
    if (
      picked !== "" &&
      !CATHLAB_NOMOR.includes(picked as (typeof CATHLAB_NOMOR)[number])
    ) {
      return;
    }
    const apiVal = picked === "" ? null : picked;

    const prevRaw = normalizeDraft(value);
    const prevApi = prevRaw === "" ? null : prevRaw;
    if ((apiVal ?? null) === (prevApi ?? null)) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cath: apiVal }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      show({ type: "success", message: "Cathlab tersimpan." });
      onSaved?.();
    } catch (e) {
      show({
        type: "error",
        message: `Gagal simpan Cathlab: ${(e as Error).message}`,
      });
      setDraft(prevRaw);
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      className="mt-0.5 w-full max-w-[12rem] rounded-md border border-cyan-900/50 bg-black/40 px-2 py-1.5 text-sm text-cyan-100 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-60"
      value={draft}
      disabled={saving}
      aria-label="Pilih Cathlab"
      onChange={(e) => {
        const v = e.target.value;
        setDraft(v);
        void persist(v);
      }}
    >
      <option value="">—</option>
      {CATHLAB_NOMOR.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

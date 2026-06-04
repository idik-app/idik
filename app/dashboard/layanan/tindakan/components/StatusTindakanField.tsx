"use client";

import { useEffect, useState } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { TINDAKAN_STATUS } from "../bridge/bridge.constants";

type Props = {
  tindakanId: string;
  value: string | null | undefined;
  onSaved?: () => void;
};

export default function StatusTindakanField({
  tindakanId,
  value,
  onSaved,
}: Props) {
  const { show } = useNotification();
  const normalized = String(value ?? "").trim();
  const [draft, setDraft] = useState(normalized);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(normalized);
  }, [value, saving, tindakanId]);

  const handleChange = async (nextValue: string) => {
    setDraft(nextValue);
    if (nextValue === normalized || saving) return;
    setSaving(true);

    try {
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextValue || null }),
        }
      );

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };

      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }

      show({ type: "success", message: "Status tindakan diperbarui." });
      onSaved?.();
    } catch (e) {
      show({
        type: "error",
        message: `Gagal simpan status: ${(e as Error).message}`,
      });
      setDraft(normalized);
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      value={draft}
      disabled={saving}
      onChange={(e) => void handleChange(e.target.value)}
      className="w-full max-w-[20rem] rounded-xl border border-white/12 bg-[#5C6573] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
    >
      <option value="" className="bg-[#2D3748]">Pilih Status</option>
      {TINDAKAN_STATUS.map((st) => (
        <option key={st} value={st} className="bg-[#2D3748]">
          {st}
        </option>
      ))}
    </select>
  );
}

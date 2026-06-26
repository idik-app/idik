"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
import {
  TINDAKAN_STATUS,
  getStatusKeteranganLabel,
  statusNeedsKeterangan,
} from "../bridge/bridge.constants";
import { cn } from "@/lib/utils";

export type StatusTindakanSavedInfo = {
  field: "status" | "status_keterangan";
  value: string | null;
};

type Props = {
  tindakanId: string;
  value: string | null | undefined;
  statusKeterangan?: string | null;
  onSaved?: (info: StatusTindakanSavedInfo) => void;
};

export default function StatusTindakanField({
  tindakanId,
  value,
  statusKeterangan,
  onSaved,
}: Props) {
  const { show } = useNotification();
  const normalized = String(value ?? "").trim();
  const normalizedKet = String(statusKeterangan ?? "").trim();
  const [draft, setDraft] = useState(normalized);
  const [keteranganDraft, setKeteranganDraft] = useState(normalizedKet);
  const [saving, setSaving] = useState(false);
  const [savingKet, setSavingKet] = useState(false);
  const lastKetRef = useRef(normalizedKet);

  useEffect(() => {
    if (!saving) setDraft(normalized);
  }, [value, saving, tindakanId]);

  useEffect(() => {
    if (!savingKet) {
      setKeteranganDraft(normalizedKet);
      lastKetRef.current = normalizedKet;
    }
  }, [statusKeterangan, savingKet, tindakanId]);

  const patchFields = useCallback(
    async (
      body: Record<string, unknown>,
      successMessage: string,
      saved: StatusTindakanSavedInfo,
    ) => {
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };

      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }

      show({ type: "success", message: successMessage });
      onSaved?.(saved);
    },
    [onSaved, show, tindakanId],
  );

  const handleChange = async (nextValue: string) => {
    setDraft(nextValue);
    if (nextValue === normalized || saving) return;
    setSaving(true);

    const savedValue = nextValue || null;
    try {
      await patchFields(
        { status: savedValue },
        "Status tindakan diperbarui.",
        { field: "status", value: savedValue },
      );
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

  const persistKeterangan = useCallback(async () => {
    const next = keteranganDraft.trim();
    if (next === lastKetRef.current || savingKet) return;
    setSavingKet(true);
    try {
      await patchFields(
        { status_keterangan: next || null },
        "Keterangan status disimpan.",
        { field: "status_keterangan", value: next || null },
      );
      lastKetRef.current = next;
    } catch (e) {
      show({
        type: "error",
        message: `Gagal simpan keterangan: ${(e as Error).message}`,
      });
      setKeteranganDraft(lastKetRef.current);
    } finally {
      setSavingKet(false);
    }
  }, [keteranganDraft, patchFields, savingKet, show]);

  const keteranganLabel = getStatusKeteranganLabel(draft);
  const showKeterangan = statusNeedsKeterangan(draft) && Boolean(keteranganLabel);

  return (
    <div className="flex w-full max-w-[28rem] flex-col gap-2">
      <select
        value={draft}
        disabled={saving}
        onChange={(e) => void handleChange(e.target.value)}
        className="w-full rounded-xl border border-white/12 bg-[#5C6573] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
      >
        <option value="" className="bg-[#2D3748]">
          Pilih Status
        </option>
        {TINDAKAN_STATUS.map((st) => (
          <option key={st} value={st} className="bg-[#2D3748]">
            {st}
          </option>
        ))}
      </select>

      {showKeterangan && keteranganLabel && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-white/80 dark:text-white/90">
            {keteranganLabel}
          </label>
          <textarea
            rows={3}
            disabled={savingKet}
            value={keteranganDraft}
            placeholder={`${keteranganLabel}...`}
            onChange={(e) => setKeteranganDraft(e.target.value)}
            onBlur={() => void persistKeterangan()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void persistKeterangan();
              }
            }}
            className={cn(
              "w-full resize-y rounded-xl border border-white/12 bg-[#5C6573] px-3 py-2 text-xs text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50",
              "dark:text-white dark:placeholder:text-white/90",
            )}
          />
          <p className="text-[10px] text-white/65 dark:text-white/80">
            Simpan otomatis saat keluar dari kolom.
          </p>
        </div>
      )}
    </div>
  );
}

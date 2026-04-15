"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useMasterPerawat } from "@/app/hooks/useMasterData";
import {
  PerawatCombobox,
  formatPerawatLabel,
  type PerawatOption,
} from "@/components/ui/perawat-combobox";

export type TimPerawatFieldKey =
  | "asisten"
  | "sirkuler"
  | "logger"
  | "asmed"
  | "resume_erm"
  | "sjp"
  | "berkas_laporan"
  | "consumable_kelengkapan"
  | "billing_simrs"
  | "pj_laporan";

type Props = {
  tindakanId: string;
  field: TimPerawatFieldKey;
  value: string | null | undefined;
  onSaved?: () => void;
};

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export default function MasterPerawatTimField({
  tindakanId,
  field,
  value,
  onSaved,
}: Props) {
  const { show } = useNotification();
  const listId = useId();
  const { perawat: options, isLoading: loading } = useMasterPerawat();
  const [draft, setDraft] = useState(() => norm(String(value ?? "")));
  const [saving, setSaving] = useState(false);
  const lastPersistedRef = useRef("");
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    lastPersistedRef.current =
      value == null || value === "" ? "" : norm(String(value));
  }, [value, tindakanId, field]);

  useEffect(() => {
    setDraft(norm(String(value ?? "")));
  }, [value, tindakanId, field]);

  const persist = async (nextLabel: string | null, isBlur = false) => {
    const trimmed = nextLabel == null ? "" : norm(nextLabel);
    const apiVal = trimmed.length ? trimmed : null;
    const nextKey = apiVal ?? "";
    if (nextKey === lastPersistedRef.current) return;

    // Jika blur, jangan tampilkan status saving agar tidak mengganggu navigasi tab
    if (!isBlur) setSaving(true);
    
    try {
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: apiVal }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      lastPersistedRef.current = nextKey;
      
      // Berikan jeda sedikit sebelum refresh agar transisi UI/Tab selesai
      setTimeout(() => {
        onSaved?.();
      }, 500);
    } catch (e) {
      if (!isBlur) {
        show({
          type: "error",
          message: `Gagal simpan: ${(e as Error).message}`,
        });
        setDraft(lastPersistedRef.current);
      }
    } finally {
      if (!isBlur) setSaving(false);
    }
  };

  const handleBlurCommit = (current: string) => {
    if (skipBlurCommitRef.current) return;
    const trimmed = norm(current);
    void persist(trimmed.length ? trimmed : null, true); // Gunakan mode silent
  };

  return (
    <div className="space-y-2">
      <PerawatCombobox
        listboxId={`${listId}-${field}`}
        value={draft}
        disabled={saving}
        onChange={(label) => setDraft(label)}
        onSelectOption={(picked) => {
          skipBlurCommitRef.current = true;
          const canonical = formatPerawatLabel(picked);
          setDraft(canonical);
          void persist(canonical);
          queueMicrotask(() => {
            skipBlurCommitRef.current = false;
          });
        }}
        onBlurCommit={handleBlurCommit}
        options={options}
        loading={loading}
        tone="drawer"
      />
    </div>
  );
}

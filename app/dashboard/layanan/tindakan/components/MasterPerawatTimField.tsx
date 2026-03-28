"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
import {
  PerawatCombobox,
  formatPerawatLabel,
  type PerawatOption,
} from "@/components/ui/perawat-combobox";

export type TimPerawatFieldKey = "asisten" | "sirkuler" | "logger";

type Props = {
  tindakanId: string;
  field: TimPerawatFieldKey;
  value: string | null | undefined;
  onSaved?: () => void;
  /** Naikkan dari parent (mis. setelah tambah master) agar daftar di-fetch ulang. */
  masterReloadToken?: number;
};

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export default function MasterPerawatTimField({
  tindakanId,
  field,
  value,
  onSaved,
  masterReloadToken = 0,
}: Props) {
  const { show } = useNotification();
  const listId = useId();
  const [options, setOptions] = useState<PerawatOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(() => norm(String(value ?? "")));
  const [saving, setSaving] = useState(false);
  const lastPersistedRef = useRef("");
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    lastPersistedRef.current =
      value == null || value === "" ? "" : norm(String(value));
  }, [value, tindakanId, field]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/master-perawat", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        perawats?: PerawatOption[];
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      setOptions(Array.isArray(json.perawats) ? json.perawats : []);
    } catch (e) {
      show({
        type: "error",
        message: `Gagal memuat master perawat: ${(e as Error).message}`,
      });
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    void load();
  }, [load, masterReloadToken]);

  useEffect(() => {
    setDraft(norm(String(value ?? "")));
  }, [value, tindakanId, field]);

  const persist = async (nextLabel: string | null) => {
    const trimmed = nextLabel == null ? "" : norm(nextLabel);
    const apiVal = trimmed.length ? trimmed : null;
    const nextKey = apiVal ?? "";
    if (nextKey === lastPersistedRef.current) return;

    setSaving(true);
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
      onSaved?.();
    } catch (e) {
      show({
        type: "error",
        message: `Gagal simpan: ${(e as Error).message}`,
      });
      setDraft(lastPersistedRef.current);
    } finally {
      setSaving(false);
    }
  };

  const handleBlurCommit = (current: string) => {
    if (skipBlurCommitRef.current) return;
    const trimmed = norm(current);
    void persist(trimmed.length ? trimmed : null);
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

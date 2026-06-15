"use client";

import { useEffect, useRef, useState } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useMasterRuangan } from "@/app/hooks/useMasterData";
import {
  RuanganCombobox,
  formatRuanganLabel,
  type RuanganOption,
} from "@/components/ui/ruangan-combobox";

type Props = {
  tindakanId: string;
  value: string | null | undefined;
  onSaved?: () => void;
};

export default function RuanganTindakanField({
  tindakanId,
  value,
  onSaved,
}: Props) {
  const { show } = useNotification();
  const { ruangan: ruanganMaster, isLoading: ruanganLoading } =
    useMasterRuangan();
  const normalized = String(value ?? "").trim().toUpperCase();
  const [draft, setDraft] = useState(normalized);
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!saving) setDraft(normalized);
  }, [value, saving, tindakanId, normalized]);

  const persist = async (nextRaw: string) => {
    const next = nextRaw.trim().toUpperCase();
    if (next === normalized.toUpperCase() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruangan: next || null }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      show({ type: "success", message: "Ruangan tersimpan." });
      onSaved?.();
    } catch (e) {
      show({
        type: "error",
        message: `Gagal simpan ruangan: ${(e as Error).message}`,
      });
      setDraft(normalized);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RuanganCombobox
      listboxId={`tindakan-drawer-ruangan-${tindakanId}`}
      value={draft}
      onChange={setDraft}
      onSelectOption={(r: RuanganOption) => {
        void persist(formatRuanganLabel(r));
      }}
      onInputBlur={() => {
        void persist(draftRef.current);
      }}
      options={ruanganMaster}
      loading={ruanganLoading || saving}
      className="max-w-[20rem]"
    />
  );
}

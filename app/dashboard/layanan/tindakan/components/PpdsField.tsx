"use client";

import { useCallback, useEffect, useId, useRef, useState, useMemo } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useMasterDoctors } from "@/app/hooks/useMasterData";
import {
  DoctorCombobox,
  formatDoctorLabel,
  resolveDoctorFromLooseInput,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";
import { cn } from "@/lib/utils";

type Props = {
  tindakanId: string;
  value: string | null | undefined;
  onSaved?: () => void;
};

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export default function PpdsField({ tindakanId, value, onSaved }: Props) {
  const { show } = useNotification();
  const listId = useId();
  const { doctors: rawDoctors, isLoading: loading } = useMasterDoctors();
  
  const options = useMemo(() => {
    return rawDoctors.map((r: any) => ({
      id: r.id,
      nama_dokter: r.nama_dokter,
      spesialis: r.spesialis,
      aktif: r.aktif
    }) as DoctorOption);
  }, [rawDoctors]);

  const [draft, setDraft] = useState(() => norm(String(value ?? "")));
  const [saving, setSaving] = useState(false);
  const lastPersistedRef = useRef("");
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    lastPersistedRef.current =
      value == null || value === "" ? "" : norm(String(value));
  }, [value, tindakanId]);

  useEffect(() => {
    setDraft(norm(String(value ?? "")));
  }, [value, tindakanId]);

  const persist = useCallback(
    async (nextLabel: string | null) => {
      const trimmed = nextLabel == null ? "" : norm(nextLabel);
      const resolved = resolveDoctorFromLooseInput(options, trimmed);
      const stored = resolved ? norm(String(resolved.nama_dokter)) : trimmed;
      const nextKey = stored || "";
      if (nextKey === lastPersistedRef.current) return;

      setSaving(true);
      try {
        const res = await fetch(
          `/api/tindakan/${encodeURIComponent(tindakanId)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ppds: nextKey || null }),
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
          message: `Gagal simpan PPDS: ${(e as Error).message}`,
        });
        setDraft(lastPersistedRef.current);
      } finally {
        setSaving(false);
      }
    },
    [options, show, tindakanId, onSaved],
  );

  /**
   * Setelah master dokter termuat: samakan label tampilan + jika nilai DB masih
   * panggilan/singkat, PATCH ke nama_dokter kanonik (tanpa toast sukses; refresh list silent).
   */
  useEffect(() => {
    if (!options.length || saving) return;
    const raw = value == null || value === "" ? "" : norm(String(value));
    if (!raw) return;

    const resolved = resolveDoctorFromLooseInput(options, raw);
    if (!resolved) return;

    const storedCanonical = norm(String(resolved.nama_dokter));
    const displayCanonical = formatDoctorLabel(resolved);
    const valueNorm = norm(raw);

    if (valueNorm !== storedCanonical) {
      setDraft(displayCanonical);
      void persist(displayCanonical);
      return;
    }

    setDraft((d) =>
      norm(d) !== norm(displayCanonical) ? displayCanonical : d,
    );
  }, [options, value, tindakanId, saving, persist]);

  const handleBlurCommit = (current: string) => {
    if (skipBlurCommitRef.current) return;
    const trimmed = norm(current);
    const resolved = resolveDoctorFromLooseInput(options, trimmed);
    const canonical = resolved ? formatDoctorLabel(resolved) : trimmed;
    setDraft(canonical);
    void persist(canonical || null);
  };

  return (
    <div className="space-y-2">
      <DoctorCombobox
        listboxId={`${listId}-ppds`}
        value={draft}
        loading={loading}
        options={options}
        placeholder="Nama PPDS / cari…"
        onChange={(label) => setDraft(label)}
        onInputBlur={handleBlurCommit}
        onSelectOption={(picked) => {
          skipBlurCommitRef.current = true;
          const canonical = formatDoctorLabel(picked);
          setDraft(canonical);
          void persist(canonical);
          queueMicrotask(() => {
            skipBlurCommitRef.current = false;
          });
        }}
        inputClassName={cn(
          "rounded-md border px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1",
          "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 focus:ring-cyan-500/30",
          "dark:border-cyan-900/50 dark:bg-black/40 dark:text-white dark:placeholder:text-white/90",
          saving ? "opacity-70" : undefined,
        )}
      />
    </div>
  );
}

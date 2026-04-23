"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useMasterTindakan } from "@/app/hooks/useMasterData";
import {
  MasterTindakanCombobox,
  formatMasterTindakanLabel,
  resolveMasterTindakanAutofill,
  type MasterTindakanOption,
} from "@/components/ui/master-tindakan-combobox";
import { cn } from "@/lib/utils";

type Props = {
  tindakanId: string;
  value: string | null | undefined;
  onSaved?: () => void;
  /** Drawer tab Tindakan: kotak abu gelap + teks putih (sama seperti Sign time). */
  controlVariant?: "default" | "drawerCharcoal";
};

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export default function MasterJenisTindakanField({
  tindakanId,
  value,
  onSaved,
  controlVariant = "default",
}: Props) {
  const { show } = useNotification();
  const listId = useId();
  const { masterTindakan: rawMaster, isLoading: loading } = useMasterTindakan();
  
  const options = useMemo(() => {
    return rawMaster.map((r: any) => ({
      id: String(r.id),
      nama: String(r.nama ?? "").trim(),
      aktif: r.aktif !== false,
    }) as MasterTindakanOption);
  }, [rawMaster]);

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

  const pickerOptions = useMemo(() => {
    const v = (value == null ? "" : String(value)).trim();
    return options.filter(
      (o) => o.aktif !== false || formatMasterTindakanLabel(o) === v,
    );
  }, [options, value]);

  const persist = useCallback(
    async (nextLabel: string | null) => {
      const trimmed = nextLabel == null ? "" : norm(nextLabel);
      const resolved = trimmed
        ? resolveMasterTindakanAutofill(trimmed, options) ??
          resolveMasterTindakanAutofill(trimmed, pickerOptions)
        : null;
      const stored = resolved
        ? norm(formatMasterTindakanLabel(resolved))
        : trimmed;
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
            body: JSON.stringify({ tindakan: nextKey || null }),
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
          message: `Gagal simpan jenis tindakan: ${(e as Error).message}`,
        });
        setDraft(lastPersistedRef.current);
      } finally {
        setSaving(false);
      }
    },
    [options, pickerOptions, show, tindakanId, onSaved],
  );

  /**
   * Setelah master termuat: rapikan label + PATCH ke nama kanonik bila teks DB
   * masih singkat / tidak sama master (tanpa toast sukses; refresh list silent).
   */
  useEffect(() => {
    if (!options.length || saving) return;
    const raw = value == null || value === "" ? "" : norm(String(value));
    if (!raw) return;
    const rl = raw.toLowerCase();
    if (rl === "belum diisi") return;

    const resolved =
      resolveMasterTindakanAutofill(raw, options) ??
      resolveMasterTindakanAutofill(raw, pickerOptions);
    if (!resolved) return;

    const canonical = formatMasterTindakanLabel(resolved);
    const valueNorm = norm(raw);
    const canonicalStored = norm(canonical);

    if (valueNorm !== canonicalStored) {
      setDraft(canonical);
      void persist(canonical);
      return;
    }

    setDraft((d) =>
      norm(d) !== norm(canonical) ? canonical : d,
    );
  }, [options, value, tindakanId, saving, persist, pickerOptions]);

  const handleBlurCommit = (current: string) => {
    if (skipBlurCommitRef.current) return;
    const trimmed = norm(current);
    const resolved =
      resolveMasterTindakanAutofill(trimmed, options) ??
      resolveMasterTindakanAutofill(trimmed, pickerOptions);
    const canonical = resolved ? formatMasterTindakanLabel(resolved) : trimmed;
    setDraft(canonical);
    void persist(canonical || null);
  };

  return (
    <div className="space-y-2">
      <MasterTindakanCombobox
        listboxId={`${listId}-jenis-tindakan`}
        value={draft}
        loading={loading || saving}
        options={pickerOptions}
        onChange={(label) => setDraft(label)}
        onInputBlur={handleBlurCommit}
        onSelectOption={(picked) => {
          skipBlurCommitRef.current = true;
          const canonical = formatMasterTindakanLabel(picked);
          setDraft(canonical);
          void persist(canonical);
          queueMicrotask(() => {
            skipBlurCommitRef.current = false;
          });
        }}
        inputClassName={cn(
          "rounded-md border px-2 py-1.5 text-sm font-semibold focus:outline-none",
          controlVariant === "drawerCharcoal"
            ? "border-white/12 bg-[#5C6573] text-white placeholder:text-white/55 focus:ring-2 focus:ring-[#2C3E50]/35"
            : cn(
                "focus:ring-1",
                "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 focus:ring-cyan-500/30",
                "dark:border-cyan-900/50 dark:bg-black/40 dark:text-white dark:placeholder:text-white/90",
              ),
          saving ? "opacity-70" : undefined,
        )}
      />
    </div>
  );
}

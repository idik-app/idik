"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
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

export default function MasterDokterField({ tindakanId, value, onSaved }: Props) {
  const { show } = useNotification();
  const listId = useId();
  const [options, setOptions] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(() => norm(String(value ?? "")));
  const [saving, setSaving] = useState(false);
  const lastPersistedRef = useRef("");
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    lastPersistedRef.current =
      value == null || value === "" ? "" : norm(String(value));
  }, [value, tindakanId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/doctors", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        doctors?: unknown;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      const rows = Array.isArray(json.doctors) ? json.doctors : [];
      const mapped = rows
        .map((r) => {
          if (!r || typeof r !== "object") return null;
          const rec = r as Record<string, unknown>;
          const id = String(rec.id ?? rec.user_id ?? "").trim();
          const nama = String(rec.nama_dokter ?? rec.nama ?? "").trim();
          if (!id || !nama) return null;
          const spesialisRaw = rec.spesialis;
          const spesialis =
            typeof spesialisRaw === "string" ? spesialisRaw.trim() : "";
          const aktifRaw = rec.aktif;
          const aktif =
            typeof aktifRaw === "boolean"
              ? aktifRaw
              : typeof aktifRaw === "number"
                ? aktifRaw !== 0
                : undefined;
          return {
            id,
            nama_dokter: nama,
            spesialis: spesialis || null,
            ...(aktif !== undefined ? { aktif } : {}),
          } satisfies DoctorOption;
        })
        .filter((d): d is DoctorOption => Boolean(d));
      setOptions(mapped);
    } catch (e) {
      show({
        type: "error",
        message: `Gagal memuat master dokter: ${(e as Error).message}`,
      });
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    void load();
  }, [load]);

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
            body: JSON.stringify({ dokter: nextKey || null }),
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
          message: `Gagal simpan dokter: ${(e as Error).message}`,
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
        listboxId={`${listId}-dokter`}
        value={draft}
        loading={loading}
        options={options}
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


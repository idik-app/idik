"use client";

import { useEffect, useRef, useState } from "react";

export type KlinisFieldKey = "diagnosa" | "severity_level" | "hasil_lab_ppm";

const DEBOUNCE_MS = 550;

const MULTILINE: Record<KlinisFieldKey, boolean> = {
  diagnosa: true,
  hasil_lab_ppm: true,
  severity_level: false,
};

function draftFromValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function normalizeForCompare(raw: string): string | null {
  const t = raw.trim();
  return t === "" ? null : t;
}

function serverNormalized(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const t = String(value).trim();
  return t === "" ? null : t;
}

function draftsEqualToServer(draft: string, serverVal: unknown): boolean {
  return normalizeForCompare(draft) === serverNormalized(serverVal);
}

type Props = {
  tindakanId: string;
  field: KlinisFieldKey;
  value: unknown;
  onSaved?: () => void;
};

export default function KlinisAutosaveField({
  tindakanId,
  field,
  value,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState(() => draftFromValue(value));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    setDraft(draftFromValue(value));
  }, [value, field, tindakanId]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const persist = async (draftNow: string) => {
    if (draftsEqualToServer(draftNow, value)) return;
    const payloadVal = normalizeForCompare(draftNow);

    try {
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: payloadVal }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      onSaved?.();
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[KlinisAutosaveField]", field, e);
      }
      setDraft(draftFromValue(value));
    }
  };

  const schedulePersist = (nextDraft: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persist(nextDraft);
    }, DEBOUNCE_MS);
  };

  const flushBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void persist(draftRef.current);
  };

  const inputClass =
    "mt-0.5 w-full rounded-md border border-cyan-900/50 bg-black/40 px-2 py-1.5 text-sm text-cyan-100 placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30";

  const aria =
    field === "diagnosa"
      ? "Diagnosa"
      : field === "severity_level"
        ? "Severity"
        : "Hasil lab PPM";

  if (MULTILINE[field]) {
    return (
      <textarea
        rows={3}
        autoComplete="off"
        className={`${inputClass} min-h-[4.5rem] resize-y`}
        placeholder="—"
        value={draft}
        aria-label={aria}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          schedulePersist(v);
        }}
        onBlur={flushBlur}
      />
    );
  }

  return (
    <input
      type="text"
      autoComplete="off"
      className={inputClass}
      placeholder="—"
      value={draft}
      aria-label={aria}
      onChange={(e) => {
        const v = e.target.value;
        setDraft(v);
        schedulePersist(v);
      }}
      onBlur={flushBlur}
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatFluoroSecondsToHms,
  fluoroSecondsFromApiValue,
  parseFluoroHmsToSeconds,
} from "@/lib/tindakan/fluoroTimeFormat";
import {
  formatWaktuDisplay,
  formatWaktuForApi,
  waktuDisplayEquals,
} from "@/lib/tindakan/waktuRangeFormat";
import { cn } from "@/lib/utils";
import { useTindakanLightMode } from "../hooks/useTindakanLightMode";

export type RadiologiFieldKey =
  | "fluoro_time"
  | "dose"
  | "kv"
  | "ma"
  | "waktu";

const FIELD_KIND: Record<
  RadiologiFieldKey,
  "fluoro" | "numeric" | "waktu_range"
> = {
  fluoro_time: "fluoro",
  dose: "numeric",
  kv: "numeric",
  ma: "numeric",
  waktu: "waktu_range",
};

/** Field numerik / fluoro: simpan setelah jeda mengetik pendek. */
const DEBOUNCE_MS_DEFAULT = 550;
/** Waktu (rentang teks ~13+ karakter): jeda lebih panjang agar tidak simpan di tengah mengetik. */
const DEBOUNCE_MS_WAKTU = 3500;

function debounceMsForField(f: RadiologiFieldKey): number {
  return f === "waktu" ? DEBOUNCE_MS_WAKTU : DEBOUNCE_MS_DEFAULT;
}

function draftFromValue(field: RadiologiFieldKey, value: unknown): string {
  if (field === "fluoro_time") {
    const sec = fluoroSecondsFromApiValue(value);
    return sec != null ? formatFluoroSecondsToHms(sec) : "";
  }
  if (field === "waktu") {
    return formatWaktuDisplay(value);
  }
  if (value === null || value === undefined || value === "") return "";
  if (FIELD_KIND[field] === "numeric") {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return String(value).trim();
  }
  return String(value).trim();
}

function parseNumericLocal(
  raw: string,
): { ok: true; v: number | null } | { ok: false } {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return { ok: true, v: null };
  const n = Number(t);
  if (!Number.isFinite(n)) return { ok: false };
  return { ok: true, v: n };
}

function valueAsNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const p = parseNumericLocal(String(v));
  return p.ok ? p.v : null;
}

function numericEqual(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 1e-9;
}

function fluoroEqual(apiVal: unknown, seconds: number | null): boolean {
  const prev = fluoroSecondsFromApiValue(apiVal);
  if (prev === null && seconds === null) return true;
  if (prev === null || seconds === null) return false;
  return Math.round(prev) === Math.round(seconds);
}

type Props = {
  tindakanId: string;
  field: RadiologiFieldKey;
  value: unknown;
  onSaved?: () => void;
};

export default function RadiologiAutosaveField({
  tindakanId,
  field,
  value,
  onSaved,
}: Props) {
  const isLight = useTindakanLightMode();
  const [draft, setDraft] = useState(() => draftFromValue(field, value));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  /** Saat true, jangan timpa draft dari props — hindari race refresh (field lain / data stale). */
  const inputFocusedRef = useRef(false);
  const blurUnfocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    inputFocusedRef.current = false;
    if (blurUnfocusTimerRef.current) {
      clearTimeout(blurUnfocusTimerRef.current);
      blurUnfocusTimerRef.current = null;
    }
  }, [tindakanId]);

  useEffect(() => {
    if (inputFocusedRef.current) return;
    const next = draftFromValue(field, value);
    setDraft((prev) => {
      // Jangan hapus teks yang sudah diketik hanya karena snapshot list belum keburu ter-update.
      if (next === "" && prev.trim() !== "") return prev;
      return next;
    });
  }, [value, field, tindakanId]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurUnfocusTimerRef.current) clearTimeout(blurUnfocusTimerRef.current);
    },
    [],
  );

  const persist = async (draftNow: string) => {
    const kind = FIELD_KIND[field];
    let payloadVal: unknown;

    if (field === "fluoro_time") {
      const p = parseFluoroHmsToSeconds(draftNow);
      if (!p.ok) return;
      payloadVal = p.seconds;
      if (fluoroEqual(value, p.seconds)) return;
    } else if (field === "waktu") {
      if (waktuDisplayEquals(value, draftNow)) return;
      payloadVal = formatWaktuForApi(draftNow);
    } else if (kind === "numeric") {
      const p = parseNumericLocal(draftNow);
      if (!p.ok) return;
      payloadVal = p.v;
      if (numericEqual(p.v, valueAsNumber(value))) return;
    }

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
        console.warn("[RadiologiAutosaveField]", field, e);
      }
      // Jangan reset ke `value` — bisa kosong/stale dan membuat isian user hilang.
    }
  };

  const schedulePersist = (nextDraft: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persist(nextDraft);
    }, debounceMsForField(field));
  };

  const flushBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const d = draftRef.current;
    const kind = FIELD_KIND[field];
    if (field === "fluoro_time") {
      const p = parseFluoroHmsToSeconds(d);
      if (!p.ok) {
        setDraft(draftFromValue(field, value));
        return;
      }
      void persist(d);
      return;
    }
    if (kind === "numeric") {
      const p = parseNumericLocal(d);
      if (!p.ok) {
        setDraft(draftFromValue(field, value));
        return;
      }
      void persist(d);
      return;
    }
    if (field === "waktu") {
      void persist(d);
      return;
    }
  };

  const kind = FIELD_KIND[field];
  const ariaLabel =
    field === "fluoro_time"
      ? "Fluoro time"
      : field === "dose"
        ? "Dosis"
        : field === "kv"
          ? "kV"
          : field === "ma"
            ? "mA"
            : "Waktu";

  const inputClassNumeric = cn(
    "mt-0.5 w-full max-w-[14rem] rounded-md border px-2 py-1.5 font-mono text-sm font-semibold focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30",
    isLight
      ? "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500"
      : "border-cyan-900/50 bg-black/40 text-cyan-100 placeholder:text-gray-600",
  );
  const inputClassWaktu = cn(
    "mt-0.5 w-full max-w-[min(100%,22rem)] rounded-md border px-2 py-1.5 font-mono text-sm font-semibold focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30",
    isLight
      ? "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500"
      : "border-cyan-900/50 bg-black/40 text-cyan-100 placeholder:text-gray-600",
  );

  const handleFocus = () => {
    if (blurUnfocusTimerRef.current) {
      clearTimeout(blurUnfocusTimerRef.current);
      blurUnfocusTimerRef.current = null;
    }
    inputFocusedRef.current = true;
  };

  /**
   * Tunda "lepas fokus" agar PATCH + refresh list selesai dulu — mencegah nilai lama/kosong
   * dari props menimpa teks yang baru diketik.
   */
  const handleBlur = () => {
    flushBlur();
    if (blurUnfocusTimerRef.current) clearTimeout(blurUnfocusTimerRef.current);
    blurUnfocusTimerRef.current = setTimeout(() => {
      blurUnfocusTimerRef.current = null;
      inputFocusedRef.current = false;
      const next = draftFromValue(field, valueRef.current);
      setDraft((prev) => {
        if (next === "" && prev.trim() !== "") return prev;
        return next;
      });
    }, 800);
  };

  if (kind === "fluoro") {
    return (
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={inputClassNumeric}
        placeholder="0:00:00"
        value={draft}
        aria-label={ariaLabel}
        onFocus={handleFocus}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          schedulePersist(v);
        }}
        onBlur={handleBlur}
      />
    );
  }

  if (kind === "waktu_range") {
    return (
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        className={inputClassWaktu}
        placeholder="07.00 - 12.00"
        value={draft}
        aria-label={ariaLabel}
        onFocus={handleFocus}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          schedulePersist(v);
        }}
        onBlur={handleBlur}
      />
    );
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={inputClassNumeric}
      placeholder="—"
      value={draft}
      aria-label={ariaLabel}
      onFocus={handleFocus}
      onChange={(e) => {
        const v = e.target.value;
        setDraft(v);
        schedulePersist(v);
      }}
      onBlur={handleBlur}
    />
  );
}

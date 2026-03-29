"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTindakanLightMode } from "../hooks/useTindakanLightMode";

const DEBOUNCE_MS = 550;

export type BiayaAutosaveFieldKey =
  | "total"
  | "krs"
  | "consumable"
  | "pemakaian";

const NUMERIC: Set<BiayaAutosaveFieldKey> = new Set([
  "total",
  "krs",
  "consumable",
]);

/** Hilangkan prefiks "Rp" / "rp." dari teks nominal (tempel dari luar / data kotor). */
function stripLeadingRp(raw: string): string {
  return raw.trim().replace(/^rp\.?\s*/i, "").trim();
}

function draftFromValue(field: BiayaAutosaveFieldKey, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (NUMERIC.has(field)) {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    const p = parseNumeric(String(value));
    if (p.ok && p.v != null) return String(p.v);
    return stripLeadingRp(String(value))
      .replace(/\s/g, "")
      .replace(/\./g, "");
  }
  return String(value);
}

function parseNumeric(raw: string): { ok: true; v: number | null } | { ok: false } {
  const normalized = stripLeadingRp(raw).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!normalized) return { ok: true, v: null };
  const n = Number(normalized);
  if (!Number.isFinite(n)) return { ok: false };
  return { ok: true, v: n };
}

function valueAsNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const p = parseNumeric(String(v));
  return p.ok ? p.v : null;
}

function numericEqual(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 1e-9;
}

function normalizeTextPayload(raw: string): string | null {
  const t = raw.trim();
  return t === "" ? null : t;
}

function serverTextNorm(serverVal: unknown): string | null {
  if (serverVal === null || serverVal === undefined || serverVal === "")
    return null;
  const t = String(serverVal).trim();
  return t === "" ? null : t;
}

function textEqualServer(draft: string, serverVal: unknown): boolean {
  return normalizeTextPayload(draft) === serverTextNorm(serverVal);
}

type Props = {
  tindakanId: string;
  field: BiayaAutosaveFieldKey;
  value: unknown;
  onSaved?: () => void;
};

export default function BiayaAutosaveField({
  tindakanId,
  field,
  value,
  onSaved,
}: Props) {
  const isLight = useTindakanLightMode();
  const [draft, setDraft] = useState(() => draftFromValue(field, value));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const inputFocusedRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    inputFocusedRef.current = false;
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, [tindakanId]);

  useEffect(() => {
    if (inputFocusedRef.current) return;
    const next = draftFromValue(field, value);
    setDraft((prev) => {
      if (next === "" && prev.trim() !== "") return prev;
      return next;
    });
  }, [value, field, tindakanId]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    },
    [],
  );

  const persist = async (draftNow: string) => {
    let payloadVal: unknown;

    if (NUMERIC.has(field)) {
      const p = parseNumeric(draftNow);
      if (!p.ok) return;
      payloadVal = p.v;
      if (numericEqual(p.v, valueAsNumber(value))) return;
    } else {
      payloadVal = normalizeTextPayload(draftNow);
      if (textEqualServer(draftNow, value)) return;
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
        console.warn("[BiayaAutosaveField]", field, e);
      }
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
    if (NUMERIC.has(field)) {
      const p = parseNumeric(draftRef.current);
      if (!p.ok) {
        setDraft(draftFromValue(field, value));
        return;
      }
      void persist(draftRef.current);
      return;
    }
    void persist(draftRef.current);
  };

  const inputClass = cn(
    "mt-0.5 w-full rounded-md border px-2 py-1.5 text-sm font-semibold focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30",
    isLight
      ? "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500"
      : "border-cyan-900/50 bg-black/40 text-cyan-100 placeholder:text-gray-600",
  );
  const aria =
    field === "total"
      ? "Perolehan BPJS"
      : field === "consumable"
        ? "Consumable"
        : field === "krs"
          ? "Total KRS"
          : "Pemakaian";

  const handleFocus = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    inputFocusedRef.current = true;
  };

  const handleBlur = () => {
    flushBlur();
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      blurTimerRef.current = null;
      inputFocusedRef.current = false;
      const next = draftFromValue(field, valueRef.current);
      setDraft((prev) => {
        if (next === "" && prev.trim() !== "") return prev;
        return next;
      });
    }, 800);
  };

  if (field === "pemakaian") {
    return (
      <textarea
        rows={3}
        autoComplete="off"
        className={`${inputClass} min-h-[4.5rem] resize-y`}
        placeholder="—"
        value={draft}
        aria-label={aria}
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

  if (NUMERIC.has(field)) {
    return (
      <div
        className={cn(
          "mt-0.5 flex max-w-[min(100%,18rem)] items-center gap-1.5 rounded-md border px-2 py-1.5 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30",
          isLight
            ? "border-cyan-400/55 bg-white"
            : "border-cyan-900/50 bg-black/40",
        )}
        role="group"
        aria-label={aria}
      >
        <span
          className={cn(
            "shrink-0 text-sm font-semibold",
            isLight ? "text-cyan-700" : "text-cyan-500/90",
          )}
        >
          Rp
        </span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-sm font-semibold focus:outline-none focus:ring-0",
            isLight
              ? "text-slate-950 placeholder:text-slate-500"
              : "text-cyan-100 placeholder:text-gray-600",
          )}
          placeholder="0"
          value={draft}
          aria-label={`${aria} (angka)`}
          onFocus={handleFocus}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            schedulePersist(v);
          }}
          onBlur={handleBlur}
        />
      </div>
    );
  }

  const _exhaustive: never = field;
  return _exhaustive;
}

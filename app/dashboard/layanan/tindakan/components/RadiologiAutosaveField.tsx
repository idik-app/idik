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

export type RadiologiFieldKey =
  | "fluoro_time"
  /** Label drawer / wireframe; nilai dari kolom `dose`, simpan ke `dose`. */
  | "air_kerma"
  /** Label drawer / wireframe; nilai kolom `dap_dose` (mGy·cm) — selaras migrasi klinis. */
  | "dap_dose"
  | "kv"
  | "ma"
  | "waktu";

const FIELD_KIND: Record<
  RadiologiFieldKey,
  "fluoro" | "numeric" | "waktu_range"
> = {
  fluoro_time: "fluoro",
  air_kerma: "numeric",
  dap_dose: "numeric",
  kv: "numeric",
  ma: "numeric",
  waktu: "waktu_range",
};

/** Kunci body PATCH — selaras `getWireframeFieldValue` / kolom tindakan. */
function patchBodyKey(field: RadiologiFieldKey): string {
  if (field === "air_kerma") return "dose";
  return field;
}

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
  const [draft, setDraft] = useState(() => draftFromValue(field, value));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  /** Sinkron untuk persist — instance tidak selalu di-remount saat ganti pasien/kasus di drawer */
  const tindakanIdRef = useRef(tindakanId);
  tindakanIdRef.current = tindakanId;
  const fieldRef = useRef(field);
  fieldRef.current = field;
  /** Saat true, jangan timpa draft dari props — hindari race refresh (field lain / data stale). */
  const inputFocusedRef = useRef(false);
  const blurUnfocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);

  const lastTindakanIdRef = useRef(tindakanId);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  /** Ganti kasus → batalkan PATCH tertunda ke baris salah (drawer pakai reuse instance). */
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [tindakanId, field]);

  useEffect(() => {
    const next = draftFromValue(field, value);
    const idChanged = lastTindakanIdRef.current !== tindakanId;

    if (idChanged) {
      lastTindakanIdRef.current = tindakanId;
      inputFocusedRef.current = false;
      if (blurUnfocusTimerRef.current) {
        clearTimeout(blurUnfocusTimerRef.current);
        blurUnfocusTimerRef.current = null;
      }
      setDraft(next);
      return;
    }

    if (inputFocusedRef.current) return;
    setDraft((prev) => {
      // Jangan hapus teks yang sudah diketik hanya karena snapshot list belum keburu ter-update.
      if (next === "" && prev.trim() !== "") return prev;
      return next;
    });
  }, [value, field, tindakanId]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (blurUnfocusTimerRef.current)
        clearTimeout(blurUnfocusTimerRef.current);
    },
    [],
  );

  const persist = async (
    draftNow: string,
    snapshot?: { targetId: string; valueSnapshot: unknown; fieldSnap: RadiologiFieldKey },
  ) => {
    const targetId = String(
      snapshot?.targetId ?? tindakanIdRef.current ?? "",
    ).trim();
    const fieldNow = snapshot?.fieldSnap ?? fieldRef.current;
    const valBaseline = snapshot?.valueSnapshot ?? valueRef.current;
    const kind = FIELD_KIND[fieldNow];
    if (!targetId) return;

    let payloadVal: unknown;

    if (fieldNow === "fluoro_time") {
      const p = parseFluoroHmsToSeconds(draftNow);
      if (!p.ok) return;
      payloadVal = p.seconds;
      if (fluoroEqual(valBaseline, p.seconds)) return;
    } else if (fieldNow === "waktu") {
      if (waktuDisplayEquals(valBaseline, draftNow)) return;
      payloadVal = formatWaktuForApi(draftNow);
    } else if (kind === "numeric") {
      const p = parseNumericLocal(draftNow);
      if (!p.ok) return;
      payloadVal = p.v;
      if (numericEqual(p.v, valueAsNumber(valBaseline))) return;
    }

    try {
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(targetId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [patchBodyKey(fieldNow)]: payloadVal }),
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
        console.warn("[RadiologiAutosaveField]", fieldNow, e);
      }
      // Jangan reset ke `value` — bisa kosong/stale dan membuat isian user hilang.
    }
  };

  const schedulePersist = (nextDraft: string) => {
    const capturedId = String(tindakanIdRef.current ?? "").trim();
    const capturedField = fieldRef.current;
    const capturedValue = valueRef.current;
    if (!capturedId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      if (
        String(tindakanIdRef.current ?? "").trim() !== capturedId ||
        fieldRef.current !== capturedField
      ) {
        return;
      }
      void persist(nextDraft, {
        targetId: capturedId,
        valueSnapshot: capturedValue,
        fieldSnap: capturedField,
      });
    }, debounceMsForField(capturedField));
  };

  const flushBlur = () => {
    const snap = {
      targetId: String(tindakanIdRef.current ?? "").trim(),
      valueSnapshot: valueRef.current,
      fieldSnap: fieldRef.current as RadiologiFieldKey,
    };
    if (!snap.targetId) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const d = draftRef.current;
    const kind = FIELD_KIND[snap.fieldSnap];
    if (snap.fieldSnap === "fluoro_time") {
      const p = parseFluoroHmsToSeconds(d);
      if (!p.ok) {
        setDraft(draftFromValue(snap.fieldSnap, snap.valueSnapshot));
        return;
      }
      void persist(d, snap);
      return;
    }
    if (kind === "numeric") {
      const p = parseNumericLocal(d);
      if (!p.ok) {
        setDraft(draftFromValue(snap.fieldSnap, snap.valueSnapshot));
        return;
      }
      void persist(d, snap);
      return;
    }
    if (snap.fieldSnap === "waktu") {
      void persist(d, snap);
      return;
    }
  };

  const kind = FIELD_KIND[field];
  const ariaLabel =
    field === "fluoro_time"
      ? "Fluoro time"
      : field === "air_kerma"
        ? "Air kerma (mGy)"
        : field === "kv"
          ? "kV"
          : field === "ma"
            ? "mA"
            : field === "dap_dose"
              ? "DAP (mGy·cm)"
              : "Waktu";

  const inputClassNumeric = cn(
    "mt-0.5 w-full max-w-[14rem] rounded-md border px-2 py-1.5 font-mono text-sm font-semibold focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30",
    "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 dark:border-cyan-900/50 dark:bg-black dark:text-white dark:placeholder:text-white/90",
  );
  const inputClassWaktu = cn(
    "mt-0.5 w-full max-w-[min(100%,22rem)] rounded-md border px-2 py-1.5 font-mono text-sm font-semibold focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30",
    "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 dark:border-cyan-900/50 dark:bg-black dark:text-white dark:placeholder:text-white/90",
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

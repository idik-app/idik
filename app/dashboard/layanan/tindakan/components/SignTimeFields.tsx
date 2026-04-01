"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FIELD_LABELS } from "../bridge/wireframeDrawerTabs";
import { normalizeTimeOnlyInput } from "@/components/ui/time-only-picker";

const DEBOUNCE_MS = 550;

function draftFrom(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function normalizeStored(raw: string): string | null {
  const t = raw.trim();
  return t === "" ? null : t;
}

function formatJamSajaDisplay(raw: string): string {
  const n = normalizeTimeOnlyInput(raw);
  return n === "" ? "—" : n;
}

function serverTimeOnlyComparable(value: unknown): string | null {
  const n = normalizeTimeOnlyInput(draftFrom(value));
  return n === "" ? null : n;
}

type SignTimeFieldProps = {
  fieldKey: string;
  label: string;
  serverValue: unknown;
  tindakanId: string;
  canEdit: boolean;
  boxClass: string;
  patchJson: (body: Record<string, unknown>) => Promise<void>;
  onSaved?: () => void;
};

function SignTimeField({
  fieldKey,
  label,
  serverValue,
  tindakanId,
  canEdit,
  boxClass,
  patchJson,
  onSaved,
}: SignTimeFieldProps) {
  const [draft, setDraft] = useState(() =>
    normalizeTimeOnlyInput(draftFrom(serverValue)),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    setDraft(normalizeTimeOnlyInput(draftFrom(serverValue)));
  }, [serverValue, tindakanId]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const persist = async (draftNow: string) => {
    if (savingRef.current) return;
    const payload = normalizeStored(draftNow);
    if (payload === serverTimeOnlyComparable(serverValue)) return;
    savingRef.current = true;
    try {
      await patchJson({ [fieldKey]: payload });
    } catch (e) {
      setDraft(normalizeTimeOnlyInput(draftFrom(serverValue)));
      savingRef.current = false;
      throw e;
    }
    savingRef.current = false;
    onSaved?.();
  };

  const schedule = (next: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persist(next).catch((e) => {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[SignTimeFields] ${fieldKey}`, e);
        }
        setDraft(normalizeTimeOnlyInput(draftFrom(serverValue)));
      });
    }, DEBOUNCE_MS);
  };

  const flushNow = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void persist(draft).catch((e) => {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[SignTimeFields] ${fieldKey}`, e);
      }
      setDraft(normalizeTimeOnlyInput(draftFrom(serverValue)));
    });
  };

  return (
    <div className={boxClass}>
      <dt
        className={cn(
          "text-[10px] font-bold leading-tight",
          "text-slate-600 dark:text-white",
        )}
      >
        {label}
      </dt>
      <dd className="mt-0.5 overflow-visible">
        {canEdit ? (
          <input
            type="time"
            step={60}
            value={draft}
            onChange={(v) => {
              const next = normalizeTimeOnlyInput(v.currentTarget.value);
              setDraft(next);
              schedule(next);
            }}
            onBlur={flushNow}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                flushNow();
              }
            }}
            placeholder="hh:mm"
            className={cn(
              "w-full rounded-md border px-2 py-1.5 text-[12px] font-semibold focus:outline-none focus:ring-1",
              "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 [color-scheme:light] focus:ring-cyan-500/40 dark:border-cyan-900/50 dark:bg-black/40 dark:text-white dark:placeholder:text-white dark:[color-scheme:dark]",
            )}
          />
        ) : (
          <span
            className={cn(
              "text-[13px] font-semibold",
              "text-slate-950 dark:text-white",
            )}
          >
            {formatJamSajaDisplay(draftFrom(serverValue))}
          </span>
        )}
      </dd>
    </div>
  );
}

type Props = {
  tindakanId: string;
  signInValue: unknown;
  timeOutValue: unknown;
  signOutValue: unknown;
  onSaved?: () => void;
};

/** Sign in / Time out / Sign out (jam saja) — untuk tab Tindakan. */
export default function SignTimeFields({
  tindakanId,
  signInValue,
  timeOutValue,
  signOutValue,
  onSaved,
}: Props) {
  const canEdit = Boolean(tindakanId);

  const patchJson = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/tindakan/${encodeURIComponent(tindakanId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
    };
    if (!res.ok || !json.ok) {
      throw new Error(json.message || res.statusText);
    }
  };

  const boxClass = cn(
    "rounded-md border px-2 py-1.5",
    "border-cyan-200/80 bg-white shadow-sm dark:border-cyan-900/25 dark:bg-black/25",
  );

  return (
    <dl className="mt-2 grid grid-cols-1 gap-1.5 text-sm font-semibold">
      <SignTimeField
        fieldKey="fast_track_sign_in"
        label={`${FIELD_LABELS.fast_track_sign_in ?? "Sign in"}:`}
        serverValue={signInValue}
        tindakanId={tindakanId}
        canEdit={canEdit}
        boxClass={boxClass}
        patchJson={patchJson}
        onSaved={onSaved}
      />
      <SignTimeField
        fieldKey="fast_track_time_out"
        label={`${FIELD_LABELS.fast_track_time_out ?? "Time out"}:`}
        serverValue={timeOutValue}
        tindakanId={tindakanId}
        canEdit={canEdit}
        boxClass={boxClass}
        patchJson={patchJson}
        onSaved={onSaved}
      />
      <SignTimeField
        fieldKey="fast_track_sign_out"
        label={`${FIELD_LABELS.fast_track_sign_out ?? "Sign out"}:`}
        serverValue={signOutValue}
        tindakanId={tindakanId}
        canEdit={canEdit}
        boxClass={boxClass}
        patchJson={patchJson}
        onSaved={onSaved}
      />
    </dl>
  );
}

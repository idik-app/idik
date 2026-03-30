"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTindakanLightMode } from "../hooks/useTindakanLightMode";
import { FIELD_LABELS } from "../bridge/wireframeDrawerTabs";
import {
  TimeOnlyPicker,
  normalizeTimeOnlyInput,
} from "@/components/ui/time-only-picker";

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
  isLight: boolean;
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
  isLight,
  boxClass,
  patchJson,
  onSaved,
}: SignTimeFieldProps) {
  const [draft, setDraft] = useState(() =>
    normalizeTimeOnlyInput(draftFrom(serverValue)),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const payload = normalizeStored(draftNow);
    if (payload === serverTimeOnlyComparable(serverValue)) return;
    try {
      await patchJson({ [fieldKey]: payload });
    } catch (e) {
      setDraft(normalizeTimeOnlyInput(draftFrom(serverValue)));
      throw e;
    }
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

  return (
    <div className={boxClass}>
      <dt
        className={cn(
          "text-[10px] font-bold leading-tight",
          isLight ? "text-slate-600" : "text-gray-500",
        )}
      >
        {label}
      </dt>
      <dd className="mt-0.5 overflow-visible">
        {canEdit ? (
          <TimeOnlyPicker
            appearance="drawer"
            isLight={isLight}
            value={draft}
            onChange={(v) => {
              setDraft(v);
              schedule(v);
            }}
          />
        ) : (
          <span
            className={cn(
              "text-[13px] font-semibold",
              isLight ? "text-slate-950" : "text-cyan-100/95",
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
  const isLight = useTindakanLightMode();
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
    isLight
      ? "border-cyan-200/80 bg-white shadow-sm"
      : "border-cyan-900/25 bg-black/25",
  );

  return (
    <dl className="mt-2 grid grid-cols-1 gap-1.5 text-sm font-semibold">
      <SignTimeField
        fieldKey="fast_track_sign_in"
        label={`${FIELD_LABELS.fast_track_sign_in ?? "Sign in"}:`}
        serverValue={signInValue}
        tindakanId={tindakanId}
        canEdit={canEdit}
        isLight={isLight}
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
        isLight={isLight}
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
        isLight={isLight}
        boxClass={boxClass}
        patchJson={patchJson}
        onSaved={onSaved}
      />
    </dl>
  );
}

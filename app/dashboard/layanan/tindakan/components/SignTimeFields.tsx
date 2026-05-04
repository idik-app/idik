"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FIELD_LABELS } from "../bridge/wireframeDrawerTabs";
import { normalizeTimeOnlyInput, toHHMMString } from "@/components/ui/time-only-picker";
import { Clock } from "lucide-react";

const DEBOUNCE_MS = 550;

function draftFrom(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function normalizeStored(raw: string): string | null {
  const t = raw.trim();
  // Ensure it's valid HH:mm before storing, otherwise return null or keep as is?
  // The normalizeTimeOnlyInput already returns "" if invalid.
  const n = normalizeTimeOnlyInput(t);
  return n === "" ? null : n;
}

function formatJamSajaDisplay(raw: string): string {
  const n = normalizeTimeOnlyInput(raw);
  return n === "" ? "—" : n;
}

function serverTimeOnlyComparable(value: unknown): string | null {
  const n = normalizeTimeOnlyInput(draftFrom(value));
  return n === "" ? null : n;
}

/**
 * Formats raw input into HH:mm if possible.
 * Handles 4 digits "1030" -> "10:30"
 * Handles "10.30" -> "10:30"
 */
function formatTimeOnTheFly(val: string): string {
  // Remove anything not a digit or colon
  let cleaned = val.replace(/[^0-9:]/g, "");

  // If someone pasted something like 10.30 or 10-30, replace separators if they were filtered out?
  // Actually, let's be smarter: if no colon but 4 digits, insert colon.
  if (!cleaned.includes(":") && cleaned.length === 4) {
    const h = cleaned.slice(0, 2);
    const m = cleaned.slice(2, 4);
    cleaned = `${h}:${m}`;
  }

  // Final check: if it matches HH:mm, validate ranges
  const parts = cleaned.split(":");
  if (parts.length === 2) {
    let h = parts[0];
    let m = parts[1];
    
    // Limit hours to 23, minutes to 59
    if (h.length > 2) h = h.slice(0, 2);
    if (m.length > 2) m = m.slice(0, 2);
    
    const hNum = parseInt(h, 10);
    const mNum = parseInt(m, 10);
    
    if (!isNaN(hNum) && hNum > 23) h = "23";
    if (!isNaN(mNum) && mNum > 59) m = "59";
    
    cleaned = `${h}:${m}`;
  } else if (parts.length === 1 && cleaned.length > 2) {
    // If user types 3 digits without colon, maybe wait for 4th or auto-insert?
    // Requirement says "Saat user mengetik 4 angka (misal: 1030), otomatis ubah menjadi format 10:30"
    // So if 3 digits, we leave it as is until 4th.
  }

  return cleaned.slice(0, 5);
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

  const handleSetCurrentTime = () => {
    const now = new Date();
    const timeStr = toHHMMString(now.getHours(), now.getMinutes());
    setDraft(timeStr);
    void persist(timeStr);
  };

  return (
    <div className={boxClass}>
      <dt
        className={cn(
          "text-[10px] font-bold leading-tight",
          "text-white/90",
        )}
      >
        {label}
      </dt>
      <dd className="mt-0.5 overflow-visible">
        {canEdit ? (
          <div className="relative flex items-center">
            <input
              type="text"
              value={draft}
              onChange={(e) => {
                const raw = e.target.value;
                const next = formatTimeOnTheFly(raw);
                setDraft(next);
                // Only schedule if it's a complete valid time or empty
                if (next === "" || next.length === 5) {
                  schedule(next);
                }
              }}
              onBlur={flushNow}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  flushNow();
                }
              }}
              onPaste={(e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData("text");
                // Clean any separators like . or - and replace with nothing first to get digits
                const digitsOnly = pastedData.replace(/[^0-9]/g, "");
                let next = "";
                if (digitsOnly.length >= 4) {
                   next = formatTimeOnTheFly(digitsOnly.slice(0, 4));
                } else {
                   // Fallback for cases like "10:3"
                   next = formatTimeOnTheFly(pastedData);
                }
                setDraft(next);
                if (next.length === 5) schedule(next);
              }}
              placeholder="HH:mm"
              className={cn(
                "w-full rounded-xl border py-1.5 pl-2 pr-8 text-[12px] font-semibold focus:outline-none focus:ring-1",
                "border-white/12 bg-[#5C6573] text-white placeholder:text-white/50 focus:ring-white/25",
              )}
            />
            <button
              type="button"
              onClick={handleSetCurrentTime}
              title="Set ke waktu sekarang"
              className={cn(
                "absolute right-1.5 flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                "text-white/45 hover:bg-white/10 hover:text-white",
              )}
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span
            className={cn(
              "text-[13px] font-semibold",
              "text-white",
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
  /**
   * Jika diset (mis. `saveEditor` dari bridge), PATCH + optimistic list sama seperti sel edit tabel.
   * Jika tidak diset, komponen memanggil `/api/tindakan/:id` lokal + `onSaved`.
   */
  patchExecutor?: (body: Record<string, unknown>) => Promise<void>;
};

/** Sign in / Time out / Sign out (jam saja) — untuk tab Tindakan. */
export default function SignTimeFields({
  tindakanId,
  signInValue,
  timeOutValue,
  signOutValue,
  onSaved,
  patchExecutor,
}: Props) {
  const canEdit = Boolean(tindakanId);

  const patchJson = async (body: Record<string, unknown>) => {
    if (patchExecutor) {
      await patchExecutor(body);
      return;
    }
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
    "rounded-lg border px-2 py-1.5",
    "border-white/10 bg-[#5C6573]/35 shadow-none",
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

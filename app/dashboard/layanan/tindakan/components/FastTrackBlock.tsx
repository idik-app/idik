"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTindakanLightMode } from "../hooks/useTindakanLightMode";
import { FIELD_LABELS } from "../bridge/wireframeDrawerTabs";

const DEBOUNCE_MS = 550;

function draftFrom(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function normalizeStored(raw: string): string | null {
  const t = raw.trim();
  return t === "" ? null : t;
}

function serverString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const t = String(value).trim();
  return t === "" ? null : t;
}

/** Ambil angka menit dari teks bebas (mis. "45", "45 menit", "30,5"). */
export function parseFastTrackMinutesFromText(raw: string): number | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const m = t.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatTotalForDb(sum: number): string {
  const rounded = Math.round(sum * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace(".", ",");
}

type Props = {
  tindakanId: string;
  pasienDatangValue: unknown;
  doorToBalloonValue: unknown;
  totalValue: unknown;
  onSaved?: () => void;
};

export default function FastTrackBlock({
  tindakanId,
  pasienDatangValue,
  doorToBalloonValue,
  totalValue,
  onSaved,
}: Props) {
  const isLight = useTindakanLightMode();
  const [igdDraft, setIgdDraft] = useState(() => draftFrom(pasienDatangValue));
  const [d2bDraft, setD2bDraft] = useState(() => draftFrom(doorToBalloonValue));
  const igdDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const d2bDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const igdDraftRef = useRef(igdDraft);
  const d2bDraftRef = useRef(d2bDraft);

  useEffect(() => {
    igdDraftRef.current = igdDraft;
  }, [igdDraft]);
  useEffect(() => {
    d2bDraftRef.current = d2bDraft;
  }, [d2bDraft]);

  useEffect(() => {
    setIgdDraft(draftFrom(pasienDatangValue));
  }, [pasienDatangValue, tindakanId]);
  useEffect(() => {
    setD2bDraft(draftFrom(doorToBalloonValue));
  }, [doorToBalloonValue, tindakanId]);

  useEffect(
    () => () => {
      if (igdDebounceRef.current) clearTimeout(igdDebounceRef.current);
      if (d2bDebounceRef.current) clearTimeout(d2bDebounceRef.current);
    },
    [],
  );

  const igdMin = parseFastTrackMinutesFromText(igdDraft);
  const d2bMin = parseFastTrackMinutesFromText(d2bDraft);
  const computedSum =
    igdMin != null && d2bMin != null ? igdMin + d2bMin : null;

  const patchJson = async (body: Record<string, unknown>) => {
    const res = await fetch(
      `/api/tindakan/${encodeURIComponent(tindakanId)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
    };
    if (!res.ok || !json.ok) {
      throw new Error(json.message || res.statusText);
    }
  };

  const persistTotalFromDrafts = async (
    igdStr: string,
    d2bStr: string,
    currentTotalServer: unknown,
  ) => {
    const a = parseFastTrackMinutesFromText(igdStr);
    const b = parseFastTrackMinutesFromText(d2bStr);
    const nextTotal = a != null && b != null ? formatTotalForDb(a + b) : null;
    const serverT = serverString(currentTotalServer);
    if (nextTotal === serverT) return;
    await patchJson({ total_waktu_fast_track: nextTotal });
  };

  const persistIgd = async (draftNow: string) => {
    const payload = normalizeStored(draftNow);
    if (payload === serverString(pasienDatangValue)) return;
    try {
      await patchJson({ pasien_datang_igd: payload });
    } catch (e) {
      setIgdDraft(draftFrom(pasienDatangValue));
      throw e;
    }
    try {
      await persistTotalFromDrafts(
        draftNow,
        d2bDraftRef.current,
        totalValue,
      );
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[FastTrackBlock] total_waktu_fast_track", e);
      }
    }
    onSaved?.();
  };

  const persistD2b = async (draftNow: string) => {
    const payload = normalizeStored(draftNow);
    if (payload === serverString(doorToBalloonValue)) return;
    try {
      await patchJson({ door_to_balloon: payload });
    } catch (e) {
      setD2bDraft(draftFrom(doorToBalloonValue));
      throw e;
    }
    try {
      await persistTotalFromDrafts(
        igdDraftRef.current,
        draftNow,
        totalValue,
      );
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[FastTrackBlock] total_waktu_fast_track", e);
      }
    }
    onSaved?.();
  };

  const scheduleIgd = (next: string) => {
    if (igdDebounceRef.current) clearTimeout(igdDebounceRef.current);
    igdDebounceRef.current = setTimeout(() => {
      igdDebounceRef.current = null;
      void persistIgd(next).catch((e) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[FastTrackBlock] pasien_datang_igd", e);
        }
        setIgdDraft(draftFrom(pasienDatangValue));
      });
    }, DEBOUNCE_MS);
  };

  const scheduleD2b = (next: string) => {
    if (d2bDebounceRef.current) clearTimeout(d2bDebounceRef.current);
    d2bDebounceRef.current = setTimeout(() => {
      d2bDebounceRef.current = null;
      void persistD2b(next).catch((e) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[FastTrackBlock] door_to_balloon", e);
        }
        setD2bDraft(draftFrom(doorToBalloonValue));
      });
    }, DEBOUNCE_MS);
  };

  const flushIgd = () => {
    if (igdDebounceRef.current) {
      clearTimeout(igdDebounceRef.current);
      igdDebounceRef.current = null;
    }
    void persistIgd(igdDraftRef.current).catch((e) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[FastTrackBlock] pasien_datang_igd blur", e);
      }
      setIgdDraft(draftFrom(pasienDatangValue));
    });
  };

  const flushD2b = () => {
    if (d2bDebounceRef.current) {
      clearTimeout(d2bDebounceRef.current);
      d2bDebounceRef.current = null;
    }
    void persistD2b(d2bDraftRef.current).catch((e) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[FastTrackBlock] door_to_balloon blur", e);
      }
      setD2bDraft(draftFrom(doorToBalloonValue));
    });
  };

  const inputClass = cn(
    "mt-0.5 w-full rounded-md border px-2 py-1.5 text-sm font-semibold focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30",
    isLight
      ? "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500"
      : "border-cyan-900/50 bg-black/40 text-cyan-100 placeholder:text-gray-600",
  );

  const boxClass = cn(
    "rounded-md border px-2 py-1.5",
    isLight
      ? "border-cyan-200/80 bg-white shadow-sm"
      : "border-cyan-900/25 bg-black/25",
  );

  const canEdit = Boolean(tindakanId);

  const totalDisplay =
    computedSum != null
      ? `${computedSum.toLocaleString("id-ID")} menit (otomatis)`
      : "—";

  return (
    <dl className="grid grid-cols-1 gap-1.5 text-sm font-semibold">
      <div className={boxClass}>
        <dt
          className={cn(
            "text-[10px] font-bold leading-tight",
            isLight ? "text-slate-600" : "text-gray-500",
          )}
        >
          {FIELD_LABELS.pasien_datang_igd ?? "Pasien datang di IGD"}
        </dt>
        <dd className="mt-0.5">
          {canEdit ? (
            <input
              type="text"
              autoComplete="off"
              className={inputClass}
              placeholder="Menit (contoh: 25)"
              aria-label="Pasien datang di IGD, menit"
              value={igdDraft}
              onChange={(e) => {
                const v = e.target.value;
                setIgdDraft(v);
                scheduleIgd(v);
              }}
              onBlur={flushIgd}
            />
          ) : (
            <span
              className={cn(
                "text-[13px] font-semibold",
                isLight ? "text-slate-950" : "text-cyan-100/95",
              )}
            >
              {draftFrom(pasienDatangValue) || "—"}
            </span>
          )}
        </dd>
      </div>

      <div className={boxClass}>
        <dt
          className={cn(
            "text-[10px] font-bold leading-tight",
            isLight ? "text-slate-600" : "text-gray-500",
          )}
        >
          {FIELD_LABELS.door_to_balloon ?? "Door to balloon"}
        </dt>
        <dd className="mt-0.5">
          {canEdit ? (
            <input
              type="text"
              autoComplete="off"
              className={inputClass}
              placeholder="Menit cathlab (contoh: 62)"
              aria-label="Door to balloon, menit"
              value={d2bDraft}
              onChange={(e) => {
                const v = e.target.value;
                setD2bDraft(v);
                scheduleD2b(v);
              }}
              onBlur={flushD2b}
            />
          ) : (
            <span
              className={cn(
                "text-[13px] font-semibold",
                isLight ? "text-slate-950" : "text-cyan-100/95",
              )}
            >
              {draftFrom(doorToBalloonValue) || "—"}
            </span>
          )}
        </dd>
      </div>

      <div className={boxClass}>
        <dt
          className={cn(
            "text-[10px] font-bold leading-tight",
            isLight ? "text-slate-600" : "text-gray-500",
          )}
        >
          {FIELD_LABELS.total_waktu_fast_track ?? "Total waktu"}
        </dt>
        <dd
          className={cn(
            "mt-0.5 text-[13px] font-semibold leading-snug break-words",
            isLight ? "text-slate-950" : "text-cyan-100/95",
          )}
        >
          {totalDisplay}
        </dd>
        <p
          className={cn(
            "mt-1 text-[10px] font-medium leading-snug",
            isLight ? "text-slate-500" : "text-gray-500",
          )}
        >
          Penjumlahan otomatis: waktu jalur IGD + door-to-balloon cathlab (kedua
          isian harus berupa angka menit).
        </p>
      </div>

      {!canEdit ? (
        <p
          className={cn(
            "rounded-md border border-dashed px-2 py-2 text-[11px] font-medium",
            isLight
              ? "border-amber-300/80 bg-amber-50/80 text-amber-950"
              : "border-amber-700/40 bg-amber-950/20 text-amber-200/85",
          )}
        >
          Baris tanpa ID kasus — isian Fast-Track tidak dapat disimpan dari sini.
        </p>
      ) : null}
    </dl>
  );
}

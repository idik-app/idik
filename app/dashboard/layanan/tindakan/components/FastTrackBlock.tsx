"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTindakanLightMode } from "../hooks/useTindakanLightMode";
import { FIELD_LABELS } from "../bridge/wireframeDrawerTabs";
import { DatetimeLocalPicker } from "@/components/ui/datetime-local-picker";
import FastTrackPhotoDropzone from "./FastTrackPhotoDropzone";

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

/** Nilai valid untuk input datetime-local: YYYY-MM-DDTHH:mm */
function normalizeDatetimeLocalInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const d = Date.parse(t);
  if (!Number.isFinite(d)) return "";
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = dt.getFullYear();
  const mo = pad(dt.getMonth() + 1);
  const da = pad(dt.getDate());
  const h = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${y}-${mo}-${da}T${h}:${mi}`;
}

function parseToEpochMs(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const d = Date.parse(t);
  return Number.isFinite(d) ? d : null;
}

/** Durasi menit dari waktu IGD → waktu balloon (D2B); wajib t_balloon >= t_igd. */
function minutesFromIgdToBalloon(igdStr: string, balloonStr: string): number | null {
  const t0 = parseToEpochMs(igdStr);
  const t1 = parseToEpochMs(balloonStr);
  if (t0 == null || t1 == null) return null;
  const diff = t1 - t0;
  if (diff < 0) return null;
  return Math.round(diff / 60_000);
}

function formatTotalForDb(minutes: number): string {
  const rounded = Math.round(minutes * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace(".", ",");
}

/** Tampilan Indonesia, jam 24 jam (bukan AM/PM). */
function formatWaktuDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) return "—";
  const ms = parseToEpochMs(t);
  if (ms == null) return t;
  return format(new Date(ms), "EEEE, d MMM yyyy, HH:mm", { locale: idLocale });
}

type Props = {
  tindakanId: string;
  pasienDatangValue: unknown;
  doorToBalloonValue: unknown;
  totalValue: unknown;
  fastTrackFotosValue: unknown;
  onSaved?: () => void;
};

export default function FastTrackBlock({
  tindakanId,
  pasienDatangValue,
  doorToBalloonValue,
  totalValue,
  fastTrackFotosValue,
  onSaved,
}: Props) {
  const isLight = useTindakanLightMode();
  const [igdDraft, setIgdDraft] = useState(() =>
    normalizeDatetimeLocalInput(draftFrom(pasienDatangValue)),
  );
  const [d2bDraft, setD2bDraft] = useState(() =>
    normalizeDatetimeLocalInput(draftFrom(doorToBalloonValue)),
  );
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
    setIgdDraft(normalizeDatetimeLocalInput(draftFrom(pasienDatangValue)));
  }, [pasienDatangValue, tindakanId]);
  useEffect(() => {
    setD2bDraft(normalizeDatetimeLocalInput(draftFrom(doorToBalloonValue)));
  }, [doorToBalloonValue, tindakanId]);

  useEffect(
    () => () => {
      if (igdDebounceRef.current) clearTimeout(igdDebounceRef.current);
      if (d2bDebounceRef.current) clearTimeout(d2bDebounceRef.current);
    },
    [],
  );

  const computedMinutes = minutesFromIgdToBalloon(igdDraft, d2bDraft);

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

  const persistTotalFromDrafts = async (
    igdStr: string,
    balloonStr: string,
    currentTotalServer: unknown,
  ) => {
    const mins = minutesFromIgdToBalloon(igdStr, balloonStr);
    const nextTotal = mins != null ? formatTotalForDb(mins) : null;
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
      setIgdDraft(normalizeDatetimeLocalInput(draftFrom(pasienDatangValue)));
      throw e;
    }
    try {
      await persistTotalFromDrafts(draftNow, d2bDraftRef.current, totalValue);
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
      setD2bDraft(normalizeDatetimeLocalInput(draftFrom(doorToBalloonValue)));
      throw e;
    }
    try {
      await persistTotalFromDrafts(igdDraftRef.current, draftNow, totalValue);
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
        setIgdDraft(normalizeDatetimeLocalInput(draftFrom(pasienDatangValue)));
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
        setD2bDraft(normalizeDatetimeLocalInput(draftFrom(doorToBalloonValue)));
      });
    }, DEBOUNCE_MS);
  };

  const boxClass = cn(
    "rounded-md border px-2 py-1.5",
    isLight
      ? "border-cyan-200/80 bg-white shadow-sm"
      : "border-cyan-900/25 bg-black/25",
  );

  const canEdit = Boolean(tindakanId);

  const totalDisplay =
    computedMinutes != null
      ? `${computedMinutes.toLocaleString("id-ID")} menit (otomatis)`
      : "—";

  const invalidOrder =
    igdDraft &&
    d2bDraft &&
    parseToEpochMs(igdDraft) != null &&
    parseToEpochMs(d2bDraft) != null &&
    parseToEpochMs(d2bDraft)! < parseToEpochMs(igdDraft)!;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(200px,280px)]">
        <dl className="grid grid-cols-1 gap-1.5 text-sm font-semibold">
          <div className={boxClass}>
            <dt
              className={cn(
                "text-[10px] font-bold leading-tight",
                isLight ? "text-slate-600" : "text-gray-500",
              )}
            >
              {FIELD_LABELS.pasien_datang_igd ?? "Waktu pasien tiba di IGD"}
            </dt>
            <dd className="mt-0.5 overflow-visible">
              {canEdit ? (
                <DatetimeLocalPicker
                  appearance="drawer"
                  isLight={isLight}
                  value={igdDraft}
                  onChange={(v) => {
                    setIgdDraft(v);
                    scheduleIgd(v);
                  }}
                />
              ) : (
                <span
                  className={cn(
                    "text-[13px] font-semibold",
                    isLight ? "text-slate-950" : "text-cyan-100/95",
                  )}
                >
                  {formatWaktuDisplay(draftFrom(pasienDatangValue))}
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
              {FIELD_LABELS.door_to_balloon ?? "Waktu door-to-balloon (cathlab)"}
            </dt>
            <dd className="mt-0.5 overflow-visible">
              {canEdit ? (
                <DatetimeLocalPicker
                  appearance="drawer"
                  isLight={isLight}
                  value={d2bDraft}
                  onChange={(v) => {
                    setD2bDraft(v);
                    scheduleD2b(v);
                  }}
                />
              ) : (
                <span
                  className={cn(
                    "text-[13px] font-semibold",
                    isLight ? "text-slate-950" : "text-cyan-100/95",
                  )}
                >
                  {formatWaktuDisplay(draftFrom(doorToBalloonValue))}
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
              {invalidOrder ? (
                <span
                  className={cn(
                    "font-semibold",
                    isLight ? "text-amber-800" : "text-amber-200/95",
                  )}
                >
                  Urutan waktu tidak valid (balloon sebelum tiba IGD)
                </span>
              ) : (
                totalDisplay
              )}
            </dd>
            <p
              className={cn(
                "mt-1 text-[10px] font-medium leading-snug",
                isLight ? "text-slate-500" : "text-gray-500",
              )}
            >
              Total dihitung otomatis: selisih menit dari waktu tiba IGD hingga
              waktu first device / balloon di cathlab (door-to-balloon).
            </p>
          </div>
        </dl>

        <FastTrackPhotoDropzone
          tindakanId={tindakanId}
          fotosValue={fastTrackFotosValue}
          canEdit={canEdit}
          isLight={isLight}
          onSaved={onSaved}
        />
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
          Baris tanpa ID kasus — isian Fast-Track tidak dapat disimpan dari
          sini.
        </p>
      ) : null}
    </div>
  );
}

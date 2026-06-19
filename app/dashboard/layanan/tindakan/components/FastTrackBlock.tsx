"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FIELD_LABELS } from "../bridge/wireframeDrawerTabs";
import FastTrackPhotoDropzone from "./FastTrackPhotoDropzone";
import { DatetimeLocalPicker } from "@/components/ui/datetime-local-picker";

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
  
  // Jika formatnya sudah YYYY-MM-DDTHH:mm atau YYYY-MM-DD HH:mm, normalisasi separator T langsung
  const match = t.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
  }

  // Ganti 'T' dengan spasi untuk string tanpa zona waktu (tidak berakhiran Z / offset +/-)
  // guna memaksa browser menginterpretasikan waktu sebagai waktu lokal client.
  let normalizedT = t;
  if (t.includes("T") && !t.includes("Z") && !t.includes("+") && !t.match(/-\d{2}:\d{2}$/)) {
    normalizedT = t.replace("T", " ");
  }

  const d = Date.parse(normalizedT);
  if (!Number.isFinite(d)) return "";
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = dt.getFullYear();
  const mo = pad(dt.getMonth() + 1);
  const da = pad(dt.getDate());
  const h = dt.getHours();
  const mi = dt.getMinutes();
  return `${y}-${mo}-${da}T${pad(h)}:${pad(mi)}`;
}

function parseToEpochMs(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  let normalizedT = t;
  if (t.includes("T") && !t.includes("Z") && !t.includes("+") && !t.match(/-\d{2}:\d{2}$/)) {
    normalizedT = t.replace("T", " ");
  }
  const d = Date.parse(normalizedT);
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
  isFastTrackValue: unknown;
  pasienDatangValue: unknown;
  doorToBalloonValue: unknown;
  totalValue: unknown;
  fastTrackFotosValue: unknown;
  onSaved?: () => void;
};

export default function FastTrackBlock({
  tindakanId,
  isFastTrackValue,
  pasienDatangValue,
  doorToBalloonValue,
  totalValue,
  fastTrackFotosValue,
  onSaved,
}: Props) {
  const [isFt, setIsFt] = useState(() => {
    const v = isFastTrackValue;
    return v === true || v === 1 || String(v) === "true" || String(v) === "1";
  });
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
  }, [pasienDatangValue]);

  useEffect(() => {
    setD2bDraft(normalizeDatetimeLocalInput(draftFrom(doorToBalloonValue)));
  }, [doorToBalloonValue]);

  const computedMinutes = minutesFromIgdToBalloon(igdDraft, d2bDraft);

  useEffect(() => {
    const v = isFastTrackValue;
    const active =
      v === true || v === 1 || String(v) === "true" || String(v) === "1";

    setIsFt(active);

    // Auto-fix: Jika data sudah ada tapi flag is_fast_track masih false/null,
    // aktifkan secara otomatis agar sinkron dengan data yang ada.
    // Gunakan computedMinutes (draft) untuk mendeteksi kesiapan data KPI.
    const isDataReady = computedMinutes != null;

    if (!active && isDataReady && tindakanId) {
      if (process.env.NODE_ENV === "development") {
        console.log("AUTO-ACTIVATING FT:", { tindakanId, computedMinutes });
      }
      void patchJson({ is_fast_track: true }).then(() => {
        setIsFt(true);
        onSaved?.();
      });
    }
  }, [
    isFastTrackValue,
    tindakanId,
    computedMinutes, // Trigger saat total waktu terisi
  ]);

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
      const msg = json.message || res.statusText;
      // Graceful fail: Jika kolom belum ada di database, jangan throw error yang merusak UI.
      if (msg.includes("is_fast_track") && msg.includes("column")) {
        console.warn("[FastTrackBlock] is_fast_track column missing in DB schema cache. Run migration.", msg);
        return;
      }
      throw new Error(msg);
    }
  };

  const toggleFastTrack = async (checked: boolean) => {
    setIsFt(checked);
    try {
      await patchJson({ is_fast_track: checked });
      onSaved?.();
    } catch (e) {
      setIsFt(!checked);
      if (process.env.NODE_ENV === "development") {
        console.warn("[FastTrackBlock] is_fast_track", e);
      }
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
      // Jika waktu IGD diisi, pastikan status is_fast_track aktif secara implisit jika belum.
      const updates: Record<string, any> = { pasien_datang_igd: payload };
      if (!isFt && payload) {
        updates.is_fast_track = true;
        setIsFt(true);
      }
      await patchJson(updates);
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
      const updates: Record<string, any> = { door_to_balloon: payload };
      if (!isFt && payload) {
        updates.is_fast_track = true;
        setIsFt(true);
      }
      await patchJson(updates);
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
    "rounded-xl border px-3 py-2 shadow-none",
    "border-[#8B98A8]/90 bg-[#A8B4C2]",
  );

  const nativeDatetimeClass = cn(
    "w-full rounded-xl border border-white/12 bg-[#5C6573] px-2 py-1.5 text-left text-[12px] font-semibold text-white shadow-none outline-none transition-colors",
    "placeholder:text-white/55 hover:bg-[#545C6A] focus:ring-2 focus:ring-[#2C3E50]/35",
    "[color-scheme:dark]",
    "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90 [&::-webkit-calendar-picker-indicator]:invert",
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
      {/* Status Toggle */}
      <div className={cn(boxClass, "flex items-center justify-between gap-3")}>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[#1a202c]">
            Status Fast-Track STEMI
          </dt>
          <dd className="mt-0.5 text-[11px] font-medium text-[#2d3748]">
            Aktifkan untuk menampilkan indikator KPI di tabel utama.
          </dd>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={isFt}
            disabled={!canEdit}
            onChange={(e) => void toggleFastTrack(e.target.checked)}
          />
          <div
            className={cn(
              "h-6 w-11 shrink-0 rounded-full bg-[#8B98A8] transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#2C3E50]/40",
              isFt ? "bg-[#2C3E50] after:translate-x-5" : "",
            )}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(200px,280px)]">
        <dl className="grid grid-cols-1 gap-1.5 text-sm font-semibold">
          <div className={boxClass}>
            <dt className="text-[10px] font-bold leading-tight text-[#1a202c]">
              {FIELD_LABELS.pasien_datang_igd ?? "Waktu pasien tiba di IGD"}
            </dt>
            <dd className="mt-0.5 overflow-visible">
              {canEdit ? (
                <DatetimeLocalPicker
                  value={igdDraft}
                  onChange={(v) => {
                    setIgdDraft(v);
                    scheduleIgd(v);
                  }}
                  appearance="drawer"
                  disablePortal
                  triggerClassName="w-full rounded-xl border border-white/12 bg-[#5C6573] px-2 py-1.5 text-left text-[12px] font-semibold text-white shadow-none outline-none transition-colors hover:bg-[#545C6A] focus:ring-2 focus:ring-[#2C3E50]/35"
                  triggerIconClassName="text-white/80"
                />
              ) : (
                <span className="text-[13px] font-semibold text-[#1a202c]">
                  {formatWaktuDisplay(draftFrom(pasienDatangValue))}
                </span>
              )}
            </dd>
          </div>

          <div className={boxClass}>
            <dt className="text-[10px] font-bold leading-tight text-[#1a202c]">
              {FIELD_LABELS.door_to_balloon ?? "Waktu door-to-balloon (cathlab)"}
            </dt>
            <dd className="mt-0.5 overflow-visible">
              {canEdit ? (
                <DatetimeLocalPicker
                  value={d2bDraft}
                  onChange={(v) => {
                    setD2bDraft(v);
                    scheduleD2b(v);
                  }}
                  appearance="drawer"
                  disablePortal
                  triggerClassName="w-full rounded-xl border border-white/12 bg-[#5C6573] px-2 py-1.5 text-left text-[12px] font-semibold text-white shadow-none outline-none transition-colors hover:bg-[#545C6A] focus:ring-2 focus:ring-[#2C3E50]/35"
                  triggerIconClassName="text-white/80"
                />
              ) : (
                <span className="text-[13px] font-semibold text-[#1a202c]">
                  {formatWaktuDisplay(draftFrom(doorToBalloonValue))}
                </span>
              )}
            </dd>
          </div>

          <div className={boxClass}>
            <dt className="text-[10px] font-bold leading-tight text-[#1a202c]">
              {FIELD_LABELS.total_waktu_fast_track ?? "Total waktu"}
            </dt>
            <dd className="mt-0.5 break-words text-[13px] font-semibold leading-snug text-[#1a202c]">
              {invalidOrder ? (
                <span className="font-semibold text-amber-900">
                  Urutan waktu tidak valid (balloon sebelum tiba IGD)
                </span>
              ) : (
                totalDisplay
              )}
            </dd>
            <p className="mt-1 text-[10px] font-medium leading-snug text-[#4a5568]">
              Total dihitung otomatis: selisih menit dari waktu tiba IGD hingga
              waktu first device / balloon di cathlab (door-to-balloon).
            </p>
          </div>
        </dl>

        <FastTrackPhotoDropzone
          tindakanId={tindakanId}
          fotosValue={fastTrackFotosValue}
          canEdit={canEdit}
          onSaved={onSaved}
          drawerMuted
        />
      </div>

      {!canEdit ? (
        <p
          className={cn(
            "rounded-md border border-dashed px-2 py-2 text-[11px] font-medium",
            "border-amber-300/80 bg-amber-50/80 text-amber-950 dark:border-amber-700/40 dark:bg-amber-950/20 dark:text-white",
          )}
        >
          Baris tanpa ID kasus — isian Fast-Track tidak dapat disimpan dari
          sini.
        </p>
      ) : null}
    </div>
  );
}

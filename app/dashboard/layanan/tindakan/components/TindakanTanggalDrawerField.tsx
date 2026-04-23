"use client";

import { Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CAL_MONTH: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function extractCalendarDateKey(raw: string): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/i);
  if (m) {
    const day = m[1].padStart(2, "0");
    const mon = CAL_MONTH[m[2].toLowerCase().slice(0, 3)];
    const year = m[3];
    if (mon) return `${year}-${mon}-${day}`;
  }
  return null;
}

function todayYmdWib(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const inputClass = cn(
  "mt-0.5 min-w-0 flex-1 rounded-xl border border-white/12 bg-[#5C6573] px-2 py-1.5 text-left text-[12px] font-semibold text-white shadow-none outline-none transition-colors",
  "placeholder:text-white/50 hover:bg-[#545C6A] focus:ring-2 focus:ring-[#2C3E50]/35",
  "[color-scheme:dark]",
  "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90 [&::-webkit-calendar-picker-indicator]:invert",
);

type Props = {
  tindakanId: string;
  value: unknown;
  onSaved?: () => void;
};

export default function TindakanTanggalDrawerField({
  tindakanId,
  value,
  onSaved,
}: Props) {
  const normalized =
    extractCalendarDateKey(String(value ?? "").trim()) ?? "";
  const [draft, setDraft] = useState(normalized);
  const [saving, setSaving] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (focusedRef.current || saving) return;
    setDraft(normalized);
  }, [normalized, saving, tindakanId]);

  const persist = async (iso: string) => {
    const next = iso.trim();
    if (next && !/^\d{4}-\d{2}-\d{2}$/.test(next)) return;
    if (next === normalized) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tanggal: next || null }),
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
    } catch {
      setDraft(normalized);
    } finally {
      setSaving(false);
    }
  };

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.click();
    }
  };

  return (
    <div className="flex max-w-full items-stretch gap-1">
      <input
        type="date"
        ref={pickerRef}
        disabled={saving || !tindakanId}
        min="1900-01-01"
        max={todayYmdWib()}
        value={draft}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          focusedRef.current = false;
          void persist(e.target.value);
        }}
        className={inputClass}
        aria-label="Tanggal tindakan"
      />
      <button
        type="button"
        disabled={saving || !tindakanId}
        className={cn(
          "mt-0.5 inline-flex shrink-0 items-center justify-center rounded-xl border border-white/12 bg-[#5C6573] px-2 text-white transition hover:bg-[#545C6A] focus:outline-none focus:ring-2 focus:ring-[#2C3E50]/35 disabled:opacity-50",
        )}
        aria-label="Buka kalender tanggal tindakan"
        onMouseDown={(e) => e.preventDefault()}
        onClick={openPicker}
      >
        <Calendar className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

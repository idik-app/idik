"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, Trash2 } from "lucide-react";
import { useNotification } from "@/app/contexts/NotificationContext";
import {
  TINDAKAN_STATUS,
  getStatusKeteranganLabel,
  statusNeedsKeterangan,
} from "../bridge/bridge.constants";
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

function extractCalendarDateKey(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/i);
  if (m) {
    const day = m[1].padStart(2, "0");
    const mon = CAL_MONTH[m[2].toLowerCase().slice(0, 3)];
    const year = m[3];
    if (mon) return `${year}-${mon}-${day}`;
  }
  return "";
}

function todayYmdWib(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export type StatusTindakanSavedInfo = {
  field: "status" | "status_keterangan" | "status_tanggal";
  value: string | null;
};

type Props = {
  tindakanId: string;
  value: string | null | undefined;
  statusKeterangan?: string | null;
  statusTanggal?: string | null;
  onSaved?: (info: StatusTindakanSavedInfo) => void;
};

export default function StatusTindakanField({
  tindakanId,
  value,
  statusKeterangan,
  statusTanggal,
  onSaved,
}: Props) {
  const { show } = useNotification();
  const normalizedStatus = String(value ?? "").trim();
  const normalizedKet = String(statusKeterangan ?? "").trim();
  const normalizedTanggal = extractCalendarDateKey(statusTanggal);

  const [draft, setDraft] = useState(normalizedStatus);
  const [keteranganDraft, setKeteranganDraft] = useState(normalizedKet);
  const [tanggalDraft, setTanggalDraft] = useState(normalizedTanggal);

  const [saving, setSaving] = useState(false);
  const [savingKet, setSavingKet] = useState(false);
  const [savingTanggal, setSavingTanggal] = useState(false);

  const lastKetRef = useRef(normalizedKet);
  const lastTanggalRef = useRef(normalizedTanggal);
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!saving) setDraft(normalizedStatus);
  }, [value, saving, tindakanId, normalizedStatus]);

  useEffect(() => {
    if (!savingKet) {
      setKeteranganDraft(normalizedKet);
      lastKetRef.current = normalizedKet;
    }
  }, [statusKeterangan, savingKet, tindakanId, normalizedKet]);

  useEffect(() => {
    if (!savingTanggal) {
      setTanggalDraft(normalizedTanggal);
      lastTanggalRef.current = normalizedTanggal;
    }
  }, [statusTanggal, savingTanggal, tindakanId, normalizedTanggal]);

  const patchFields = useCallback(
    async (
      body: Record<string, unknown>,
      successMessage: string,
      saved: StatusTindakanSavedInfo | StatusTindakanSavedInfo[],
    ) => {
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
        warnings?: string[];
      };

      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }

      const warnings = Array.isArray(json.warnings) ? json.warnings : [];
      for (const w of warnings) {
        show({ type: "warning", message: w });
      }

      show({ type: "success", message: successMessage });
      const items = Array.isArray(saved) ? saved : [saved];
      for (const item of items) {
        onSaved?.(item);
      }
    },
    [onSaved, show, tindakanId],
  );

  const notifyCriticalStatus = useCallback(
    (nextValue: string | null) => {
      if (nextValue === "Dibatalkan") {
        show({
          type: "warning",
          message:
            "Status tindakan diubah ke Dibatalkan. Pastikan keterangan pembatalan diisi.",
        });
      } else if (nextValue === "Meninggal") {
        show({
          type: "error",
          message:
            "Status tindakan diubah ke Meninggal (DOT). Isi Keterangan & Tanggal Meninggal.",
        });
      }
    },
    [show],
  );

  const handleStatusChange = async (nextValue: string) => {
    setDraft(nextValue);
    if (nextValue === normalizedStatus || saving) return;
    setSaving(true);

    const savedValue = nextValue || null;
    setKeteranganDraft("");
    lastKetRef.current = "";

    try {
      await patchFields(
        { status: savedValue, status_keterangan: null },
        "Status tindakan diperbarui.",
        [
          { field: "status", value: savedValue },
          { field: "status_keterangan", value: null },
        ],
      );
      notifyCriticalStatus(savedValue);
    } catch (e) {
      show({
        type: "error",
        message: `Gagal simpan status: ${(e as Error).message}`,
      });
      setDraft(normalizedStatus);
      setKeteranganDraft(normalizedKet);
      lastKetRef.current = normalizedKet;
    } finally {
      setSaving(false);
    }
  };

  const persistKeterangan = useCallback(async () => {
    const next = keteranganDraft.trim();
    if (next === lastKetRef.current || savingKet) return;
    setSavingKet(true);
    try {
      await patchFields(
        { status_keterangan: next || null },
        "Keterangan status disimpan.",
        { field: "status_keterangan", value: next || null },
      );
      lastKetRef.current = next;
    } catch (e) {
      show({
        type: "error",
        message: `Gagal simpan keterangan: ${(e as Error).message}`,
      });
      setKeteranganDraft(lastKetRef.current);
    } finally {
      setSavingKet(false);
    }
  }, [keteranganDraft, patchFields, savingKet, show]);

  const persistTanggal = useCallback(
    async (nextIso: string) => {
      const next = nextIso.trim();
      if (next === lastTanggalRef.current || savingTanggal) return;
      setSavingTanggal(true);
      try {
        await patchFields(
          { status_tanggal: next || null },
          "Tanggal status disimpan.",
          { field: "status_tanggal", value: next || null },
        );
        lastTanggalRef.current = next;
      } catch (e) {
        show({
          type: "error",
          message: `Gagal simpan tanggal status: ${(e as Error).message}`,
        });
        setTanggalDraft(lastTanggalRef.current);
      } finally {
        setSavingTanggal(false);
      }
    },
    [patchFields, savingTanggal, show],
  );

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.click();
    }
  };

  const keteranganLabel = getStatusKeteranganLabel(draft);
  const showKeterangan = statusNeedsKeterangan(draft) && Boolean(keteranganLabel);
  const keteranganEmpty =
    showKeterangan && !String(keteranganDraft ?? "").trim();

  return (
    <div className="flex w-full max-w-[28rem] flex-col gap-2.5 rounded-xl border border-white/12 bg-[#2D3748]/60 p-2.5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Dropdown */}
        <div className="min-w-[130px] flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/80 dark:text-white/90">
            Status Tindakan
          </label>
          <select
            value={draft}
            disabled={saving}
            onChange={(e) => void handleStatusChange(e.target.value)}
            className="w-full rounded-xl border border-white/12 bg-[#5C6573] px-3 py-1.5 text-xs text-white dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
          >
            <option value="" className="bg-[#2D3748] text-white">
              Pilih Status
            </option>
            {TINDAKAN_STATUS.map((st) => (
              <option key={st} value={st} className="bg-[#2D3748] text-white">
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Tanggal Status Picker */}
        <div className="min-w-[150px] flex-1">
          <div className="mb-1 flex items-center justify-between gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-white/80 dark:text-white/90">
              {draft === "Meninggal" ? "Tanggal Meninggal" : "Tanggal Status"}
            </label>
            {tanggalDraft && (
              <button
                type="button"
                disabled={savingTanggal || !tindakanId}
                onClick={() => {
                  setTanggalDraft("");
                  void persistTanggal("");
                }}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition dark:text-rose-300"
                title="Hapus tanggal"
              >
                <Trash2 className="h-3 w-3" />
                <span>Hapus tanggal</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <input
              type="date"
              ref={pickerRef}
              disabled={savingTanggal || !tindakanId}
              min="1900-01-01"
              max={todayYmdWib()}
              value={tanggalDraft}
              onChange={(e) => {
                setTanggalDraft(e.target.value);
                void persistTanggal(e.target.value);
              }}
              className={cn(
                "w-full rounded-xl border border-white/12 bg-[#5C6573] px-2.5 py-1.5 text-xs font-semibold text-white dark:text-white outline-none transition-colors",
                "placeholder:text-white/90 dark:placeholder:text-white/90 focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50",
                "[color-scheme:dark]",
                "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90 [&::-webkit-calendar-picker-indicator]:invert",
              )}
            />
            <button
              type="button"
              disabled={savingTanggal || !tindakanId}
              onClick={openPicker}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/12 bg-[#5C6573] p-1.5 text-white transition hover:bg-[#545C6A] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
              aria-label="Pilih Tanggal Status"
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Keterangan TextArea */}
      {showKeterangan && keteranganLabel && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-white/80 dark:text-white/90">
            {keteranganLabel}
          </label>
          <textarea
            rows={2}
            disabled={savingKet}
            value={keteranganDraft}
            placeholder={`${keteranganLabel}...`}
            onChange={(e) => setKeteranganDraft(e.target.value)}
            onBlur={() => void persistKeterangan()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void persistKeterangan();
              }
            }}
            className={cn(
              "w-full resize-y rounded-xl border bg-[#5C6573] px-3 py-2 text-xs text-white placeholder:text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50",
              "dark:text-white dark:placeholder:text-white/90",
              keteranganEmpty
                ? "border-amber-400/70"
                : "border-white/12",
            )}
          />
          {keteranganEmpty ? (
            <p className="text-[10px] font-medium text-amber-200 dark:text-amber-300">
              Keterangan disarankan diisi.
            </p>
          ) : (
            <p className="text-[10px] text-white/65 dark:text-white/80">
              Simpan otomatis saat keluar dari kolom.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

import {
  RuanganCombobox,
  formatRuanganLabel,
  type RuanganOption,
} from "@/components/ui/ruangan-combobox";
import {
  MasterTindakanCombobox,
  formatMasterTindakanLabel,
  type MasterTindakanOption,
} from "@/components/ui/master-tindakan-combobox";
import {
  DoctorCombobox,
  formatDoctorLabel,
  resolveDoctorFromLooseInput,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";
import {
  PerawatCombobox,
  formatPerawatLabel,
  type PerawatOption,
} from "@/components/ui/perawat-combobox";

// Styling constants matching TindakanTable.tsx
export const JADWAL_LIGHT_INPUT =
  "!w-full !min-w-0 !truncate !border-none !bg-transparent !p-0 !text-center !text-xs !font-extrabold !text-[#1B2B44] !placeholder:text-slate-400 focus:!outline-none focus:!ring-0 select-all";

export const JADWAL_PRIMARY_LIGHT_INPUT =
  "!w-full !min-w-0 !truncate !border-none !bg-transparent !p-0 !text-left !text-xs !font-extrabold !text-[#1B2B44] !placeholder:text-slate-400 focus:!outline-none focus:!ring-0 select-all";

export const TINDAKAN_TABLE_INPUT_TEXT = JADWAL_LIGHT_INPUT;
export const TINDAKAN_TABLE_PRIMARY_COL_INPUT = JADWAL_PRIMARY_LIGHT_INPUT;
export const JADWAL_TABLE_INPUT = JADWAL_LIGHT_INPUT;

/** Zoom sel fokus di modal Jadwal Cath Lab (compact 14 kolom). */
export const JADWAL_ZOOM_CELL_CLASSES =
  "focus-within:z-[80]";
export const JADWAL_ZOOM_INNER_CLASSES = cn(
  "min-w-0 w-full rounded transition-all duration-150 ease-out p-0.5 overflow-hidden",
  "focus-within:bg-[#EEF2FF] focus-within:ring-2 focus-within:ring-indigo-600 focus-within:rounded-md",
);

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

export function extractCalendarDateKey(raw: string): string | null {
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
  // dd/mm/yyyy or dd-mm-yyyy
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const mon = m[2].padStart(2, "0");
    const year = m[3];
    const mi = Number(mon);
    const di = Number(day);
    if (mi >= 1 && mi <= 12 && di >= 1 && di <= 31) {
      return `${year}-${mon}-${day}`;
    }
  }
  return null;
}

export function EditableMasterTindakanCell({
  value,
  masterOptions,
  loading,
  listboxId,
  onCommit,
  recordId,
}: {
  value: string;
  masterOptions: MasterTindakanOption[];
  loading: boolean;
  listboxId: string;
  onCommit: (next: string) => Promise<boolean>;
  recordId?: string;
}) {
  const pickerOptions = useMemo(() => {
    const v = value.trim();
    return masterOptions.filter(
      (o) => o.aktif !== false || formatMasterTindakanLabel(o) === v,
    );
  }, [masterOptions, value]);

  const [draft, setDraft] = useState(value.trim());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(value.trim());
  }, [value, saving]);

  const tryCommit = async (nextRaw: string) => {
    const cur = value.trim();
    const next = nextRaw.trim();
    if (next === cur || saving) return;
    setDraft(next);
    setSaving(true);
    const ok = await onCommit(next);
    setSaving(false);
    if (!ok) setDraft(cur);
  };

  return (
    <MasterTindakanCombobox
      listboxId={listboxId}
      value={draft}
      onChange={setDraft}
      onSelectOption={(o) => {
        void tryCommit(formatMasterTindakanLabel(o));
      }}
      onInputBlur={(finalText) => {
        void tryCommit(finalText);
      }}
      options={pickerOptions}
      loading={loading || saving}
      className="max-w-[14rem] max-2xl:max-w-full"
      inputClassName={TINDAKAN_TABLE_INPUT_TEXT}
    />
  );
}

export function EditableTimeCell({
  value,
  onCommit,
  placeholder = "",
}: {
  value: string;
  onCommit: (next: string) => Promise<boolean>;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value.trim());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(value.trim());
  }, [value, saving]);

  const formatTimeInput = (input: string) => {
    const digits = input.replace(/\D/g, "");
    if (!digits) return "";

    if (digits.length >= 4) {
      const hh = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      return `${hh}:${mm}`;
    }
    if (digits.length === 3) {
      const hh = `0${digits.slice(0, 1)}`;
      const mm = digits.slice(1, 3);
      return `${hh}:${mm}`;
    }
    return digits;
  };

  const commit = useCallback(async () => {
    if (saving) return;
    const formatted = formatTimeInput(draft);
    const cur = value.trim();
    if (formatted === cur) {
      setDraft(cur);
      return;
    }
    setDraft(formatted);
    setSaving(true);
    const ok = await onCommit(formatted);
    setSaving(false);
    if (!ok) setDraft(cur);
  }, [draft, value, onCommit, saving]);

  return (
    <input
      type="text"
      readOnly={saving}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(value.trim());
        }
      }}
      className={cn(
        "w-full rounded border px-2 py-1 text-xs font-semibold focus:outline-none text-center",
        "border-cyan-400/55 bg-white text-slate-800 dark:border-cyan-700/50 dark:bg-black/40 dark:text-slate-100",
      )}
    />
  );
}

export function EditableTextCell({
  value,
  onCommit,
  placeholder = "",
  variant = "default",
  onDirty,
}: {
  value: string;
  onCommit: (next: string) => Promise<boolean>;
  placeholder?: string;
  variant?: "default" | "table";
  onDirty?: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (saving || focused) return;
    if (
      inputRef.current &&
      document.activeElement === inputRef.current
    ) {
      return;
    }
    setDraft(value);
  }, [value, saving, focused]);

  const commit = useCallback(async () => {
    if (saving) return;
    const next = draft.trim();
    if (next === value.trim()) return;
    setDraft(next);
    setSaving(true);
    const ok = await onCommit(next);
    setSaving(false);
    if (!ok) setDraft(value.trim());
  }, [draft, onCommit, saving, value]);

  return (
    <input
      ref={inputRef}
      type="text"
      readOnly={saving}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => {
        setDraft(e.target.value);
        onDirty?.();
      }}
      onFocus={() => {
        setFocused(true);
        onDirty?.();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => {
        setFocused(false);
        void commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(value.trim());
        }
      }}
      className={
        variant === "table"
          ? JADWAL_TABLE_INPUT
          : cn(
              "w-full rounded border px-2 py-1 text-xs font-semibold focus:outline-none text-center",
              "border-cyan-400/55 bg-white text-slate-800 dark:border-cyan-700/50 dark:bg-black/40 dark:text-slate-100",
            )
      }
    />
  );
}

export function EditableDateCell({
  value,
  onCommit,
  variant = "default",
  onDirty,
}: {
  value: string;
  onCommit: (next: string) => Promise<boolean>;
  variant?: "default" | "table";
  onDirty?: () => void;
}) {
  const normalizedValue =
    extractCalendarDateKey(String(value ?? "").trim()) ?? "";
  const [draft, setDraft] = useState(normalizedValue);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (saving || focused) return;
    if (
      inputRef.current &&
      document.activeElement === inputRef.current
    ) {
      return;
    }
    setDraft(normalizedValue);
  }, [normalizedValue, saving, focused]);

  const commit = useCallback(async () => {
    if (saving) return;
    const next = draft.trim();
    const curIso = normalizedValue;
    if (next === curIso) return;
    if (next && !/^\d{4}-\d{2}-\d{2}$/.test(next)) {
      setDraft(normalizedValue);
      return;
    }
    setDraft(next);
    setSaving(true);
    const ok = await onCommit(next);
    setSaving(false);
    if (!ok) setDraft(normalizedValue);
  }, [draft, normalizedValue, onCommit, saving]);

  return (
    <input
      ref={inputRef}
      type="date"
      readOnly={saving}
      value={draft}
      min="1900-01-01"
      onChange={(e) => {
        setDraft(e.target.value);
        onDirty?.();
      }}
      onFocus={() => {
        setFocused(true);
        onDirty?.();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => {
        setFocused(false);
        void commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(normalizedValue);
        }
      }}
      className={
        variant === "table"
          ? cn(
              JADWAL_TABLE_INPUT,
              "min-w-0 !text-[#1B2B44] [color-scheme:light]",
            )
          : cn(
              "w-full min-w-0 max-2xl:min-w-0 2xl:min-w-[8.5rem] rounded border px-2 py-1 max-2xl:px-0.5 text-xs font-semibold focus:outline-none",
              "border-cyan-400/55 bg-white text-amber-800 [color-scheme:light] dark:border-cyan-700/50 dark:bg-black/40 dark:text-slate-100 dark:[color-scheme:dark]",
            )
      }
    />
  );
}

export function EditableRuanganCell({
  value,
  ruanganMaster,
  loading,
  listboxId,
  onCommit,
  recordId,
}: {
  value: string;
  ruanganMaster: RuanganOption[];
  loading: boolean;
  listboxId: string;
  onCommit: (next: string) => Promise<boolean>;
  recordId?: string;
}) {
  const [draft, setDraft] = useState(value.trim().toUpperCase());
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!saving) setDraft(value.trim().toUpperCase());
  }, [value, saving]);

  const tryCommit = async (nextRaw: string) => {
    const cur = value.trim().toUpperCase();
    const next = nextRaw.trim().toUpperCase();
    if (next === cur || saving) return;
    setDraft(next);
    setSaving(true);
    const ok = await onCommit(next);
    setSaving(false);
    if (!ok) setDraft(cur);
  };

  return (
    <RuanganCombobox
      listboxId={listboxId}
      value={draft}
      onChange={setDraft}
      onSelectOption={(r) => {
        void tryCommit(formatRuanganLabel(r));
      }}
      onInputBlur={() => {
        void tryCommit(draftRef.current);
      }}
      options={ruanganMaster}
      loading={loading || saving}
      className="max-w-[14rem] max-2xl:max-w-full"
      inputClassName={TINDAKAN_TABLE_INPUT_TEXT}
    />
  );
}

export function EditableDokterCell({
  value,
  doctorOptionsMaster,
  dokterOptions,
  loading,
  listboxId,
  onCommit,
  recordId,
}: {
  value: string;
  doctorOptionsMaster: DoctorOption[];
  dokterOptions: string[];
  loading: boolean;
  listboxId: string;
  onCommit: (next: string) => Promise<boolean>;
  recordId?: string;
}) {
  const [draft, setDraft] = useState(value.trim());
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!saving) setDraft(value.trim());
  }, [value, saving]);

  const tryCommit = async (nextRaw: string) => {
    const curDisplay = value.trim();
    const nextText = nextRaw.trim();
    
    const m = doctorOptionsMaster;
    const resolved = m.length
      ? resolveDoctorFromLooseInput(m, nextText)
      : null;
    const display = resolved
      ? formatDoctorLabel(resolved)
      : nextText;
      
    if (display === curDisplay || saving) {
      setDraft(display);
      return;
    }
    
    setDraft(display);
    setSaving(true);
    const ok = await onCommit(nextText);
    setSaving(false);
    if (!ok) setDraft(curDisplay);
  };

  return (
    <DoctorCombobox
      listboxId={listboxId}
      value={draft}
      onChange={setDraft}
      onSelectOption={(picked) => {
        void tryCommit(formatDoctorLabel(picked));
      }}
      onInputBlur={() => {
        void tryCommit(draftRef.current);
      }}
      options={
        doctorOptionsMaster.length
          ? doctorOptionsMaster
          : dokterOptions.map((nama, idx) => ({
              id: `local:${idx}`,
              nama_dokter: nama,
              spesialis: null,
              aktif: true,
            }))
      }
      loading={loading || saving}
      className="max-w-none w-full [&_input]:pr-2"
      inputClassName={TINDAKAN_TABLE_PRIMARY_COL_INPUT}
    />
  );
}

export function EditablePerawatCell({
  value,
  perawatMaster,
  loading,
  listboxId,
  onCommit,
}: {
  value: string;
  perawatMaster: PerawatOption[];
  loading: boolean;
  listboxId: string;
  onCommit: (next: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value.trim());
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!saving) setDraft(value.trim());
  }, [value, saving]);

  const tryCommit = async (nextRaw: string) => {
    const cur = value.trim();
    const next = nextRaw.trim();
    if (next === cur || saving) return;
    setDraft(next);
    setSaving(true);
    const ok = await onCommit(next);
    setSaving(false);
    if (!ok) setDraft(cur);
  };

  return (
    <PerawatCombobox
      listboxId={listboxId}
      value={draft}
      onChange={setDraft}
      onSelectOption={(p) => {
        void tryCommit(formatPerawatLabel(p));
      }}
      onBlurCommit={() => {
        void tryCommit(draftRef.current);
      }}
      options={perawatMaster}
      loading={loading || saving}
      className="max-w-none w-full"
      inputClassName={JADWAL_LIGHT_INPUT}
      tone="default"
    />
  );
}

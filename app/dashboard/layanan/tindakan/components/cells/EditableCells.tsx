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

// Styling constants matching TindakanTable.tsx
export const TINDAKAN_TABLE_INPUT_TEXT =
  "w-full text-center border-none bg-transparent p-0 text-xs font-semibold focus:outline-none focus:ring-0 select-all hover:bg-black/5 dark:hover:bg-white/5";
export const TINDAKAN_TABLE_PRIMARY_COL_INPUT =
  "w-full text-left border-none bg-transparent p-0 text-xs font-semibold focus:outline-none focus:ring-0 select-all hover:bg-black/5 dark:hover:bg-white/5";

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
      className="max-w-[14rem]"
      inputClassName={TINDAKAN_TABLE_INPUT_TEXT}
    />
  );
}

export function EditableTimeCell({
  value,
  onCommit,
  placeholder = "—",
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
  placeholder = "...",
}: {
  value: string;
  onCommit: (next: string) => Promise<boolean>;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(value);
  }, [value, saving]);

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

export function EditableDateCell({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => Promise<boolean>;
}) {
  const normalizedValue =
    extractCalendarDateKey(String(value ?? "").trim()) ?? "";
  const [draft, setDraft] = useState(normalizedValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(normalizedValue);
  }, [normalizedValue, saving]);

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
      type="date"
      readOnly={saving}
      value={draft}
      min="1900-01-01"
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
          setDraft(normalizedValue);
        }
      }}
      className={cn(
        "w-full min-w-[8.5rem] rounded border px-2 py-1 text-xs font-semibold focus:outline-none",
        "border-cyan-400/55 bg-white text-amber-800 [color-scheme:light] dark:border-cyan-700/50 dark:bg-black/40 dark:text-slate-100 dark:[color-scheme:dark]",
      )}
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
      className="max-w-[14rem]"
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

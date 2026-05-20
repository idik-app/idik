"use client";

import { Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Pasien } from "@/app/dashboard/pasien/types/pasien";
import { cn } from "@/lib/utils";
import { getWireframeFieldValue } from "../bridge/wireframeDrawerTabs";
import { normalizeJenisKelamin } from "../lib/displayTindakanRow";

const DEBOUNCE_MS = 600;

export const PASIEN_DRAWER_AUTOSAVE_KEYS = [
  "no_rm",
  "nama_pasien",
  "jenis_kelamin",
  "tgl_lahir",
  "alamat",
  "no_telp",
] as const;

export type PasienDrawerAutosaveKey =
  (typeof PASIEN_DRAWER_AUTOSAVE_KEYS)[number];

export function isPasienDrawerAutosaveKey(
  k: string,
): k is PasienDrawerAutosaveKey {
  return (PASIEN_DRAWER_AUTOSAVE_KEYS as readonly string[]).includes(k);
}

export function isPasienDrawerFieldEmpty(
  key: PasienDrawerAutosaveKey,
  raw: unknown,
): boolean {
  if (key === "jenis_kelamin") return normalizeJenisKelamin(raw) === null;
  return raw === null || raw === undefined || String(raw).trim() === "";
}

export function hasAnyEmptyPasienDrawerField(
  record: Record<string, unknown>,
): boolean {
  for (const key of PASIEN_DRAWER_AUTOSAVE_KEYS) {
    const v = getWireframeFieldValue(record, key);
    if (isPasienDrawerFieldEmpty(key, v)) return true;
  }
  return false;
}

function toYyyyMmDd(raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const dt = new Date(year, month - 1, day);
    if (
      dt.getFullYear() === year &&
      dt.getMonth() === month - 1 &&
      dt.getDate() === day
    ) {
      const m = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${m}-${dd}`;
    }
    return "";
  }
  const d = Date.parse(s);
  if (Number.isFinite(d)) {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "";
}

/** Tampilan Indonesia: `1969-11-10` → `10-11-1969` */
function isoToDmy(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

/** Terima `DD-MM-YYYY` / `DD/MM/YYYY` (tempel ketik) atau `YYYY-MM-DD`. */
function parseTglLahirToIso(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const y = Number(t.slice(0, 4));
    const m = Number(t.slice(5, 7));
    const day = Number(t.slice(8, 10));
    const dt = new Date(y, m - 1, day);
    if (
      dt.getFullYear() === y &&
      dt.getMonth() === m - 1 &&
      dt.getDate() === day
    ) {
      return t;
    }
    return null;
  }
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const dt = new Date(year, month - 1, day);
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return null;
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Tempel/ketik `1969-10-11` atau `1969-10-11T…` → tampilan `11-10-1969`. */
function normalizeTglLahirInputDisplay(v: string): string {
  const t = v.trim();
  const m = t.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/);
  if (!m) return v;
  const iso = parseTglLahirToIso(m[1]);
  if (!iso) return v;
  return isoToDmy(iso);
}

function draftFromWireframe(
  key: PasienDrawerAutosaveKey,
  raw: unknown,
): string {
  if (key === "jenis_kelamin") {
    const jk = normalizeJenisKelamin(raw);
    return jk ?? "";
  }
  if (key === "tgl_lahir") {
    const iso = toYyyyMmDd(raw);
    return iso ? isoToDmy(iso) : "";
  }
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}

function buildPatch(
  key: PasienDrawerAutosaveKey,
  draft: string,
): Record<string, string> | null {
  const t = draft.trim();
  if (key === "no_rm") {
    if (!t) return null;
    return { noRM: t };
  }
  if (key === "nama_pasien") {
    if (!t) return null;
    return { nama: t };
  }
  if (key === "jenis_kelamin") {
    if (t !== "L" && t !== "P") return null;
    return { jenisKelamin: t };
  }
  if (key === "tgl_lahir") {
    const iso = parseTglLahirToIso(t);
    if (!iso) return null;
    return { tanggalLahir: iso };
  }
  if (key === "alamat") {
    if (!t) return null;
    return { alamat: t };
  }
  if (key === "no_telp") {
    return { noHP: t };
  }
  return null;
}

function valueUnchanged(
  key: PasienDrawerAutosaveKey,
  draft: string,
  raw: unknown,
): boolean {
  if (key === "tgl_lahir") {
    const parsed = parseTglLahirToIso(draft);
    const prevIso = toYyyyMmDd(raw);
    if (!parsed && !prevIso) return true;
    if (!parsed || !prevIso) return false;
    return parsed === prevIso;
  }
  const prev = draftFromWireframe(key, raw);
  if (key === "no_telp") return draft.trim() === prev.trim();
  return draft.trim() === prev;
}

type Props = {
  pasienId: string;
  wireframeKey: PasienDrawerAutosaveKey;
  rawValue: unknown;
  onPasienUpdated: (p: Pasien) => void;
  onSaved?: () => void;
};

const inputClass =
  "mt-0.5 w-full rounded-md border border-cyan-900/50 bg-black/40 px-2 py-1.5 text-sm text-white placeholder:text-white/90 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30";

export default function PasienAutosaveField({
  pasienId,
  wireframeKey,
  rawValue,
  onPasienUpdated,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState(() =>
    draftFromWireframe(wireframeKey, rawValue),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const inputFocusedRef = useRef(false);
  const blurUnfocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const rawRef = useRef(rawValue);
  const tglLahirPickerRef = useRef<HTMLInputElement>(null);

  const lastPasienIdRef = useRef(pasienId);

  useEffect(() => {
    rawRef.current = rawValue;
  }, [rawValue]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const next = draftFromWireframe(wireframeKey, rawValue);
    const idChanged = lastPasienIdRef.current !== pasienId;

    if (idChanged) {
      lastPasienIdRef.current = pasienId;
      inputFocusedRef.current = false;
      if (blurUnfocusTimerRef.current) {
        clearTimeout(blurUnfocusTimerRef.current);
        blurUnfocusTimerRef.current = null;
      }
      setDraft(next);
      return;
    }

    if (inputFocusedRef.current) return;
    setDraft((prev) => {
      if (next === "" && prev.trim() !== "") return prev;
      return next;
    });
  }, [rawValue, wireframeKey, pasienId]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurUnfocusTimerRef.current)
        clearTimeout(blurUnfocusTimerRef.current);
    },
    [],
  );

  const persist = async (draftNow: string) => {
    if (valueUnchanged(wireframeKey, draftNow, rawRef.current)) return;
    const patch = buildPatch(wireframeKey, draftNow);
    if (!patch) return;

    try {
      const res = await fetch(
        `/api/pasien/${encodeURIComponent(pasienId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: Pasien;
        error?: unknown;
      };
      if (!res.ok || !json.ok) {
        const err = json.error;
        const msg =
          typeof err === "string"
            ? err
            : err != null
              ? JSON.stringify(err)
              : "Gagal menyimpan — periksa isian";
        throw new Error(msg);
      }
      if (json.data) onPasienUpdated(json.data);
      setSaveError(null);
      onSaved?.();
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[PasienAutosaveField]", wireframeKey, e);
      }
      setSaveError(
        e instanceof Error ? e.message : "Gagal menyimpan",
      );
    }
  };

  const schedulePersist = (nextDraft: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persist(nextDraft);
    }, DEBOUNCE_MS);
  };

  const flushBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const d = draftRef.current;
    const patch = buildPatch(wireframeKey, d);
    if (!patch) {
      setDraft(draftFromWireframe(wireframeKey, rawRef.current));
      return;
    }
    void persist(d);
  };

  const handleFocus = () => {
    if (blurUnfocusTimerRef.current) {
      clearTimeout(blurUnfocusTimerRef.current);
      blurUnfocusTimerRef.current = null;
    }
    inputFocusedRef.current = true;
  };

  const handleBlur = () => {
    flushBlur();
    if (blurUnfocusTimerRef.current)
      clearTimeout(blurUnfocusTimerRef.current);
    blurUnfocusTimerRef.current = setTimeout(() => {
      blurUnfocusTimerRef.current = null;
      inputFocusedRef.current = false;
      const next = draftFromWireframe(wireframeKey, rawRef.current);
      setDraft((prev) => {
        if (next === "" && prev.trim() !== "") return prev;
        return next;
      });
    }, 800);
  };

  if (wireframeKey === "jenis_kelamin") {
    return (
      <div className="space-y-1">
        <select
          className={`${inputClass} max-w-[14rem]`}
          aria-label="Jenis kelamin"
          value={draft === "L" || draft === "P" ? draft : ""}
          onFocus={handleFocus}
          onChange={(e) => {
            const v = e.target.value as "L" | "P" | "";
            setDraft(v);
            setSaveError(null);
            if (v === "L" || v === "P") schedulePersist(v);
          }}
          onBlur={handleBlur}
        >
          <option value="">Pilih…</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
        {saveError ? (
          <p className="text-[11px] text-rose-300/90">{saveError}</p>
        ) : null}
      </div>
    );
  }

  if (wireframeKey === "tgl_lahir") {
    const isoForPicker = parseTglLahirToIso(draft) ?? "";
    const todayIso = new Date().toISOString().slice(0, 10);

    const openNativeDatePicker = () => {
      const el = tglLahirPickerRef.current;
      if (!el) return;
      try {
        el.showPicker?.();
      } catch {
        el.click();
      }
    };

    return (
      <div className="space-y-1">
        <div className="flex max-w-[15rem] items-stretch gap-1">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="bday"
            placeholder="DD-MM-YYYY"
            className={`${inputClass} min-w-0 flex-1 font-mono`}
            value={draft}
            aria-label="Tanggal lahir"
            onFocus={handleFocus}
            onChange={(e) => {
              const v = normalizeTglLahirInputDisplay(e.target.value);
              setDraft(v);
              setSaveError(null);
              schedulePersist(v);
            }}
            onBlur={handleBlur}
          />
          <button
            type="button"
            className={cn(
              "mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md border border-cyan-900/50 bg-black/40 px-2 text-white transition hover:border-cyan-500/50 hover:bg-black/55 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30",
            )}
            aria-label="Buka kalender tanggal lahir"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              handleFocus();
              openNativeDatePicker();
            }}
          >
            <Calendar className="h-4 w-4" aria-hidden />
          </button>
          <input
            ref={tglLahirPickerRef}
            type="date"
            className="fixed left-0 top-0 h-px w-px opacity-0"
            tabIndex={-1}
            aria-hidden
            max={todayIso}
            min="1900-01-01"
            value={isoForPicker}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const next = isoToDmy(v);
              setDraft(next);
              setSaveError(null);
              schedulePersist(next);
            }}
          />
        </div>
        {saveError ? (
          <p className="text-[11px] text-rose-300/90">{saveError}</p>
        ) : null}
      </div>
    );
  }

  const placeholder =
    wireframeKey === "no_telp" ? "+628… atau 08…" : "Isi lalu tunggu sebentar…";

  return (
    <div className="space-y-1">
      <input
        type="text"
        autoComplete="off"
        className={inputClass}
        placeholder={placeholder}
        value={draft}
        aria-label={wireframeKey}
        onFocus={handleFocus}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          setSaveError(null);
          schedulePersist(v);
        }}
        onBlur={handleBlur}
      />
      {saveError ? (
        <p className="text-[11px] text-rose-300/90">{saveError}</p>
      ) : null}
    </div>
  );
}

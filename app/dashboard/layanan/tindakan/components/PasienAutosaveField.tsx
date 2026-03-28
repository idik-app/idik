"use client";

import { useEffect, useRef, useState } from "react";

import type { Pasien } from "@/app/dashboard/pasien/types/pasien";
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

function draftFromWireframe(
  key: PasienDrawerAutosaveKey,
  raw: unknown,
): string {
  if (key === "jenis_kelamin") {
    const jk = normalizeJenisKelamin(raw);
    return jk ?? "";
  }
  if (key === "tgl_lahir") return toYyyyMmDd(raw);
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
    return { tanggalLahir: t };
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
  "mt-0.5 w-full rounded-md border border-cyan-900/50 bg-black/40 px-2 py-1.5 text-sm text-cyan-100 placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30";

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

  useEffect(() => {
    rawRef.current = rawValue;
  }, [rawValue]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    inputFocusedRef.current = false;
    if (blurUnfocusTimerRef.current) {
      clearTimeout(blurUnfocusTimerRef.current);
      blurUnfocusTimerRef.current = null;
    }
  }, [pasienId]);

  useEffect(() => {
    if (inputFocusedRef.current) return;
    const next = draftFromWireframe(wireframeKey, rawValue);
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
    return (
      <div className="space-y-1">
        <input
          type="date"
          className={`${inputClass} max-w-[12rem] font-mono`}
          autoComplete="bday"
          value={draft}
          aria-label="Tanggal lahir"
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

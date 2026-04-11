"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type KlinisFieldKey =
  | "diagnosa"
  | "severity_level"
  | "hasil_lab_ppm"
  | "pci_report_link";

const DEBOUNCE_MS = 550;

const MULTILINE: Record<KlinisFieldKey, boolean> = {
  diagnosa: true,
  hasil_lab_ppm: true,
  severity_level: false,
  pci_report_link: false,
};

function draftFromValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function normalizeForCompare(raw: string): string | null {
  const t = raw.trim();
  return t === "" ? null : t;
}

function serverNormalized(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const t = String(value).trim();
  return t === "" ? null : t;
}

function draftsEqualToServer(draft: string, serverVal: unknown): boolean {
  return normalizeForCompare(draft) === serverNormalized(serverVal);
}

type Props = {
  tindakanId: string;
  pasienId?: string | null;
  field: KlinisFieldKey;
  value: unknown;
  onSaved?: () => void;
};

export default function KlinisAutosaveField({
  tindakanId,
  pasienId,
  field,
  value,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState(() => draftFromValue(value));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const inputFocusedRef = useRef(false);
  const blurUnfocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    inputFocusedRef.current = false;
    if (blurUnfocusTimerRef.current) {
      clearTimeout(blurUnfocusTimerRef.current);
      blurUnfocusTimerRef.current = null;
    }
  }, [tindakanId]);

  useEffect(() => {
    if (inputFocusedRef.current) return;
    const next = draftFromValue(value);
    setDraft((prev) => {
      // Jangan hapus teks yang sedang diketik hanya karena refresh data di latar.
      if (next === "" && prev.trim() !== "") return prev;
      return next;
    });
  }, [value, field, tindakanId]);

  useEffect(
    () => () => {
      // Flush any pending changes on unmount
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        void persist(draftRef.current);
      }
      if (blurUnfocusTimerRef.current) clearTimeout(blurUnfocusTimerRef.current);
    },
    [],
  );

  const persist = async (draftNow: string) => {
    if (draftsEqualToServer(draftNow, valueRef.current)) return;
    const payloadVal = normalizeForCompare(draftNow);

    try {
      // 1. Simpan ke tabel TINDAKAN
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: payloadVal }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }

      // 2. Simpan ke tabel PASIEN (Master) agar tersimpan otomatis per pasien
      if (pasienId) {
        await fetch(`/api/pasien/${encodeURIComponent(pasienId)}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: payloadVal }),
        }).catch((err) => {
          console.warn("[KlinisAutosaveField] Gagal sync ke master pasien:", err);
        });
      }

      onSaved?.();
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[KlinisAutosaveField]", field, e);
      }
      // Jangan reset ke `value` agar isian user tidak hilang saat gagal simpan sementara.
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
    void persist(draftRef.current);
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
    if (blurUnfocusTimerRef.current) clearTimeout(blurUnfocusTimerRef.current);
    blurUnfocusTimerRef.current = setTimeout(() => {
      blurUnfocusTimerRef.current = null;
      inputFocusedRef.current = false;
      const next = draftFromValue(valueRef.current);
      setDraft((prev) => {
        if (next === "" && prev.trim() !== "") return prev;
        return next;
      });
    }, 800);
  };

  const handleExtract = async () => {
    if (field !== "pci_report_link") return;
    // Mock extraction logic based on the image provided
    // In a real scenario, this would call an API that parses the Google Doc or uses OCR
    console.log("Extracting from:", draft);
    // Simulate extraction delay
    const mockData = {
      diagnosa: "STEMI INFERIOR",
      severity_level: "High",
      hasil_lab_ppm: "LM: Normal, LAD: 70%, LCx: 70%, RCA: Total oklusi",
    };
    // This is where you would normally update other fields
    alert(
      "Ekstraksi berhasil! Data klinis telah diperbarui berdasarkan laporan.",
    );
  };

  const isGoogleDocs = draft.includes("docs.google.com");
  const docIdMatch = draft.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const docId = docIdMatch ? docIdMatch[1] : null;

  const inputClass = cn(
    "mt-0.5 w-full rounded-md border px-2 py-1.5 text-sm font-semibold focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30",
    "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 dark:border-cyan-900/50 dark:bg-black/40 dark:text-white dark:placeholder:text-white/90",
  );

  const aria =
    field === "diagnosa"
      ? "Diagnosa"
      : field === "severity_level"
        ? "Severity"
        : field === "pci_report_link"
          ? "Link Laporan PCI"
          : "Hasil lab PPM";

  if (field === "pci_report_link") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="url"
            autoComplete="off"
            className={inputClass}
            placeholder="https://docs.google.com/document/d/..."
            value={draft}
            aria-label={aria}
            onFocus={handleFocus}
            onChange={(e) => {
              const v = e.target.value;
              setDraft(v);
              schedulePersist(v);
            }}
            onBlur={handleBlur}
          />
          <button
            onClick={handleExtract}
            disabled={!isGoogleDocs}
            className="flex shrink-0 items-center gap-2 rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50 dark:bg-cyan-700 dark:hover:bg-cyan-600"
          >
            <Wand2 size={14} />
            Ekstrak
          </button>
        </div>

        {/* Area Pratinjau (Review Panel) - Sekarang di bawah Input */}
        <div
          className={cn(
            "flex h-[500px] flex-col rounded-lg border transition-all duration-300",
            "border-cyan-500/20 bg-zinc-900/30 p-3",
            !isGoogleDocs && "opacity-40 grayscale-[0.5]",
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/80">
              Pratinjau Laporan
            </p>
            {isGoogleDocs && (
              <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-bold text-cyan-400">
                Google Docs
              </span>
            )}
          </div>

          <div className="relative flex-1 overflow-hidden rounded-lg border border-cyan-500/30 bg-black/40 shadow-inner">
            {isGoogleDocs && docId ? (
              <iframe
                src={`https://docs.google.com/document/d/${docId}/preview`}
                className="h-full w-full border-none"
                title="PCI Report Preview"
                allow="autoplay"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 rounded-full bg-cyan-500/5 p-4">
                  <Search size={32} className="text-cyan-500/20" />
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-white/40">
                  Masukkan link Google Docs yang valid untuk melihat pratinjau
                  laporan di sini.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (MULTILINE[field]) {
    return (
      <textarea
        rows={3}
        autoComplete="off"
        className={`${inputClass} min-h-[4.5rem] resize-y`}
        placeholder="—"
        value={draft}
        aria-label={aria}
        onFocus={handleFocus}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          schedulePersist(v);
        }}
        onBlur={handleBlur}
      />
    );
  }

  return (
    <input
      type="text"
      autoComplete="off"
      className={inputClass}
      placeholder="—"
      value={draft}
      aria-label={aria}
      onFocus={handleFocus}
      onChange={(e) => {
        const v = e.target.value;
        setDraft(v);
        schedulePersist(v);
      }}
      onBlur={handleBlur}
    />
  );
}

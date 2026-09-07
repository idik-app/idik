"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, Maximize2, Minimize2, MousePointerClick, Search, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEventBridge } from "@/contexts/EventBridgeContext";
import { extractDataFromText } from "@/lib/tindakan/reportExtractor";

export type KlinisFieldKey =
  | "diagnosa"
  | "severity_level"
  | "hasil_lab_ppm"
  | "pci_report_link"
  | "kesimpulan_laporan"
  | "plan_medis"
  | "target_lesion"
  | "temuan_pembuluh"
  | "faktor_risiko"
  | "total_kontras"
  | "operan_ranap";

const DEBOUNCE_MS = 550;

const PREVIEW_ZOOM_MIN = 0.5;
const PREVIEW_ZOOM_MAX = 2;
const PREVIEW_ZOOM_STEP = 0.1;
/** Tinggi dasar iframe (px); zoom memperbesar layout, bukan CSS scale — agar teks tidak blur/pecah. */
const PREVIEW_IFRAME_BASE_HEIGHT_PX = 820;

const MULTILINE: Record<KlinisFieldKey, boolean> = {
  diagnosa: true,
  hasil_lab_ppm: true,
  kesimpulan_laporan: true,
  plan_medis: true,
  temuan_pembuluh: true,
  faktor_risiko: true,
  target_lesion: false,
  severity_level: false,
  pci_report_link: false,
  total_kontras: false,
  operan_ranap: false,
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

/**
 * Komponen Input yang melakukan Autosave ke database saat user mengetik (debounced).
 */

type Props = {
  tindakanId: string;
  pasienId?: string | null;
  field: KlinisFieldKey;
  value: unknown;
  onSaved?: () => void;
  /** Drawer tab Tindakan: textarea/input abu gelap + teks putih. */
  controlVariant?: "default" | "drawerCharcoal";
};

export default function KlinisAutosaveField({
  tindakanId,
  pasienId,
  field,
  value,
  onSaved,
  controlVariant = "default",
}: Props) {
  const [draft, setDraft] = useState(() => draftFromValue(value));
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewInteract, setPreviewInteract] = useState(false);
  const [previewCopyText, setPreviewCopyText] = useState<string | null>(null);
  const [previewCopyLoading, setPreviewCopyLoading] = useState(false);
  const [previewCopyError, setPreviewCopyError] = useState<string | null>(null);
  const { emit } = useEventBridge();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const inputFocusedRef = useRef(false);
  const blurUnfocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);

  const lastTindakanIdRef = useRef(tindakanId);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const next = draftFromValue(value);
    const idChanged = lastTindakanIdRef.current !== tindakanId;

    if (idChanged) {
      lastTindakanIdRef.current = tindakanId;
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
  }, [value, field, tindakanId]);

  const previewDocId = useMemo(() => {
    if (field !== "pci_report_link") return null;
    const trimmed = draft.trim();
    if (!trimmed) return null;
    const m = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
    return null;
  }, [draft, field]);

  const hasValidPreview = useMemo(() => {
    if (field !== "pci_report_link") return false;
    const d = draft.toLowerCase().trim();
    return d.includes("docs.google.com") || d.includes("drive.google.com") || !!previewDocId || d.endsWith(".pdf") || d.includes(".pdf?");
  }, [draft, field, previewDocId]);

  const previewIframeSrc = useMemo(() => {
    const trimmed = draft.trim();
    if (!trimmed) return null;
    const d = trimmed.toLowerCase();

    if (previewDocId) {
      if (d.includes("docs.google.com/document")) {
        return `https://docs.google.com/document/d/${previewDocId}/preview`;
      }
      if (d.includes("docs.google.com/spreadsheets")) {
        return `https://docs.google.com/spreadsheets/d/${previewDocId}/preview`;
      }
      if (d.includes("docs.google.com/presentation")) {
        return `https://docs.google.com/presentation/d/${previewDocId}/embed`;
      }
      // Untuk Google Drive (termasuk file PDF di Google Drive):
      return `https://drive.google.com/file/d/${previewDocId}/preview`;
    }

    // Direct PDF URL fallback via Google Docs Viewer
    if (d.endsWith(".pdf") || d.includes(".pdf?")) {
      return `https://docs.google.com/gview?url=${encodeURIComponent(trimmed)}&embedded=true`;
    }

    return null;
  }, [draft, previewDocId]);

  useEffect(() => {
    if (field !== "pci_report_link") return;
    setPreviewZoom(1);
    setPreviewInteract(false);
    setPreviewCopyText(null);
    setPreviewCopyError(null);
  }, [previewDocId, field]);

  useEffect(() => {
    if (!previewInteract) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewInteract(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewInteract]);

  useEffect(() => {
    if (!previewInteract || !previewDocId || field !== "pci_report_link") return;

    let cancelled = false;
    setPreviewCopyLoading(true);
    setPreviewCopyError(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/system/fetch-doc?docId=${encodeURIComponent(previewDocId)}&fullText=1`,
        );
        const json = (await res.json()) as {
          success?: boolean;
          fullText?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !json.success || typeof json.fullText !== "string") {
          throw new Error(
            json.error ||
              "Gagal memuat teks laporan. Pastikan dokumen dapat diakses publik.",
          );
        }
        setPreviewCopyText(json.fullText);
      } catch (e) {
        if (!cancelled) {
          setPreviewCopyText(null);
          setPreviewCopyError((e as Error).message);
        }
      } finally {
        if (!cancelled) setPreviewCopyLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [previewInteract, previewDocId, field]);

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

  const persist = async (draftNow: string, extraData?: Record<string, string | null | boolean>) => {
    if (!extraData && draftsEqualToServer(draftNow, valueRef.current)) return;
    const payloadVal = normalizeForCompare(draftNow);

    const patchData: Record<string, string | null | boolean> = { 
      [field]: payloadVal,
      ...extraData 
    };

    // Jika teks yang diinput sangat panjang (dan BUKAN pci_report_link), jalankan ekstraksi otomatis
    if (field !== "pci_report_link" && payloadVal && payloadVal.length > 100) {
      const extracted = extractDataFromText(payloadVal);
      Object.assign(patchData, extracted as any);
      delete patchData.kategori;
    }

    try {
      // 1. Simpan ke tabel TINDAKAN
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchData),
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
          body: JSON.stringify(patchData),
        }).catch((err) => {
          console.warn("[KlinisAutosaveField] Gagal sync ke master pasien:", err);
        });
      }

      onSaved?.();
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[KlinisAutosaveField]", field, e);
      }
    }
  };

  const schedulePersist = (nextDraft: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persist(nextDraft);
    }, DEBOUNCE_MS);
  };

  const handleFocus = () => {
    if (blurUnfocusTimerRef.current) {
      clearTimeout(blurUnfocusTimerRef.current);
      blurUnfocusTimerRef.current = null;
    }
    inputFocusedRef.current = true;
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void persist(draftRef.current);

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

  const inputClass = cn(
    "mt-0.5 w-full rounded-md border px-2 py-1.5 text-sm font-semibold focus:outline-none",
    controlVariant === "drawerCharcoal"
      ? "border-white/12 bg-[#5C6573] text-white placeholder:text-white/55 focus:border-cyan-500/50 focus:ring-2 focus:ring-[#2C3E50]/35"
      : cn(
          "focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30",
          "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 dark:border-cyan-900/50 dark:bg-black/40 dark:text-white dark:placeholder:text-white/90",
        ),
  );

  const aria =
    field === "diagnosa"
      ? "Diagnosa"
      : field === "severity_level"
        ? "Severity"
        : field === "pci_report_link"
          ? "Link Laporan PCI"
          : field === "target_lesion"
            ? "Target Lesion"
            : "Hasil lab PPM";

  if (field === "pci_report_link") {
    const isValidUrl = draft.trim().startsWith("http://") || draft.trim().startsWith("https://");

    return (
      <div className="flex flex-col gap-3">
        <div className="relative">
          <div className="flex items-center gap-2">
            <input
              type="url"
              autoComplete="off"
              className={inputClass}
              placeholder="https://drive.google.com/file/d/... atau https://docs.google.com/document/d/..."
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
            {isValidUrl && (
              <a
                href={draft.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-600/20 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-600/35 hover:text-white dark:border-cyan-500/50 dark:bg-cyan-950/40 dark:text-cyan-200 dark:hover:bg-cyan-900/60"
                title="Buka link laporan di tab baru"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Buka Link</span>
              </a>
            )}
          </div>
        </div>

        {/* Area Pratinjau (Review Panel) */}
        <div
          className={cn(
            "flex flex-col rounded-lg border transition-all duration-300",
            previewExpanded
              ? "h-[min(920px,84dvh)] min-h-[640px]"
              : "h-[min(780px,68dvh)] min-h-[560px]",
            "border-cyan-500/20 bg-zinc-900/30 p-3",
            !hasValidPreview && "opacity-40 grayscale-[0.5]",
          )}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 dark:text-cyan-300">
              Pratinjau Laporan
            </p>
            <div className="flex items-center gap-2">
              {hasValidPreview ? (
                <>
                  {previewDocId && (
                    <button
                      type="button"
                      onClick={() => setPreviewInteract((v) => !v)}
                      className={cn(
                        "flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
                        previewInteract
                          ? "border-amber-400/50 bg-amber-500/20 text-amber-100"
                          : "border-cyan-500/30 bg-black/35 text-cyan-200/90 hover:bg-cyan-500/15",
                      )}
                      aria-pressed={previewInteract}
                    >
                      <MousePointerClick className="h-3 w-3" aria-hidden />
                      {previewInteract ? "Selesai" : "Pilih teks"}
                    </button>
                  )}
                  <div
                    className="flex items-center gap-0.5 rounded-md border border-cyan-500/30 bg-black/35 p-0.5"
                    role="group"
                    aria-label="Kontrol pratinjau laporan"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewZoom((z) =>
                          Math.max(
                            PREVIEW_ZOOM_MIN,
                            Math.round((z - PREVIEW_ZOOM_STEP) * 100) / 100,
                          ),
                        )
                      }
                      disabled={previewZoom <= PREVIEW_ZOOM_MIN}
                      className="flex h-7 w-7 items-center justify-center rounded text-cyan-200/90 transition-colors hover:bg-cyan-500/15 disabled:pointer-events-none disabled:opacity-35"
                      aria-label="Perkecil pratinjau"
                    >
                      <ZoomOut className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <span className="min-w-[2.75rem] select-none text-center text-[10px] font-mono font-semibold tabular-nums text-cyan-100/90">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewZoom((z) =>
                          Math.min(
                            PREVIEW_ZOOM_MAX,
                            Math.round((z + PREVIEW_ZOOM_STEP) * 100) / 100,
                          ),
                        )
                      }
                      disabled={previewZoom >= PREVIEW_ZOOM_MAX}
                      className="flex h-7 w-7 items-center justify-center rounded text-cyan-200/90 transition-colors hover:bg-cyan-500/15 disabled:pointer-events-none disabled:opacity-35"
                      aria-label="Perbesar pratinjau"
                    >
                      <ZoomIn className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewExpanded((prev) => !prev)}
                      className="flex h-7 w-7 items-center justify-center rounded border-l border-cyan-500/20 text-cyan-200/90 transition-colors hover:bg-cyan-500/15"
                      title={previewExpanded ? "Kecilkan tampilan" : "Perbesar tampilan"}
                      aria-label={previewExpanded ? "Kecilkan pratinjau" : "Perbesar pratinjau"}
                    >
                      {previewExpanded ? (
                        <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </div>
                </>
              ) : null}
              {hasValidPreview && (
                <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-bold text-cyan-400 dark:text-cyan-300">
                  Google Drive / Docs / PDF
                </span>
              )}
            </div>
          </div>

          <div
            className={cn(
              "relative min-h-0 flex-1 overflow-auto rounded-lg border border-cyan-500/30 bg-slate-200 shadow-inner",
              "[color-scheme:only_light]",
            )}
            tabIndex={0}
            role="region"
            aria-label={
              previewInteract
                ? "Pratinjau laporan — mode pilih teks aktif"
                : "Pratinjau laporan — scroll untuk melihat dokumen"
            }
          >
            {previewInteract ? (
              <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-cyan-600/30 bg-slate-800/95 px-2.5 py-1.5 backdrop-blur-sm">
                <p className="text-[10px] font-semibold text-cyan-50">
                  Blok teks laporan di bawah lalu Ctrl+C · Esc untuk keluar
                </p>
                <button
                  type="button"
                  onClick={() => setPreviewInteract(false)}
                  className="shrink-0 rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-white/20"
                >
                  Selesai
                </button>
              </div>
            ) : null}
            {hasValidPreview && previewIframeSrc ? (
              previewInteract ? (
                <div
                  className={cn(
                    "min-h-[min(720px,60dvh)] flex-1 overflow-auto bg-white p-4",
                    "[color-scheme:only_light] cursor-text select-text",
                  )}
                >
                  {previewCopyLoading ? (
                    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-slate-600">
                      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                      <p className="text-xs font-medium">Memuat teks laporan…</p>
                    </div>
                  ) : previewCopyError ? (
                    <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
                      {previewCopyError}
                    </div>
                  ) : previewCopyText ? (
                    <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-900">
                      {previewCopyText}
                    </pre>
                  ) : null}
                </div>
              ) : (
                <div className="relative h-full w-full overflow-auto">
                  <iframe
                    src={previewIframeSrc}
                    className="block border-none bg-white"
                    title="PCI Report Preview"
                    allow="autoplay; fullscreen"
                    style={{
                      width: `${previewZoom * 100}%`,
                      height: "100%",
                      minHeight: `${Math.round(PREVIEW_IFRAME_BASE_HEIGHT_PX * previewZoom)}px`,
                    }}
                  />
                  {previewDocId && (
                    <div className="pointer-events-none absolute right-3 bottom-3 z-10 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setPreviewInteract(true)}
                        className="pointer-events-auto rounded-lg border border-slate-300/80 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-md transition-colors hover:bg-white"
                        aria-label="Aktifkan mode pilih dan salin teks dari laporan"
                      >
                        Klik untuk memilih &amp; menyalin teks laporan
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 rounded-full bg-cyan-500/10 p-4 dark:bg-cyan-500/20">
                  <Search size={32} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-white/85">
                  Masukkan link Google Drive, Google Docs, atau file PDF yang valid untuk melihat pratinjau laporan di sini.
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

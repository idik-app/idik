"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Wand2, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEventBridge } from "@/contexts/EventBridgeContext";
import { extractDataFromText } from "@/lib/tindakan/reportExtractor";

export type KlinisFieldKey =
  | "diagnosa"
  | "severity_level"
  | "hasil_lab_ppm"
  | "pci_report_link"
  | "kesimpulan_laporan"
  | "plan_medis"
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
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(1);
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
    const m = draft.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return m ? m[1] : null;
  }, [draft, field]);

  useEffect(() => {
    if (field !== "pci_report_link") return;
    setPreviewZoom(1);
  }, [previewDocId, field]);

  // Otomasi Ekstrak tanpa klik jika ini adalah field pci_report_link
  useEffect(() => {
    if (field === "pci_report_link" && draft.includes("docs.google.com")) {
      // Ekstraksi otomatis saat link pertama kali ditempel/diubah
      const timer = setTimeout(() => {
        void handleExtract(false); 
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [draft, field]);

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

  const persist = async (draftNow: string, extraData?: Record<string, string | null>) => {
    if (!extraData && draftsEqualToServer(draftNow, valueRef.current)) return;
    const payloadVal = normalizeForCompare(draftNow);

    // Gabungkan data dari input saat ini dengan data ekstraksi jika ada
    const patchData: Record<string, string | null> = { 
      [field]: payloadVal,
      ...extraData 
    };

    // Jika teks yang diinput sangat panjang (kemungkinan paste laporan), jalankan ekstraksi otomatis
    if (payloadVal && payloadVal.length > 100) {
      const extracted = extractDataFromText(payloadVal);
      // Hanya masukkan kategori jika belum ada di extraData (hasil fetch-doc)
      if (extracted.kategori && !patchData.kategori) {
        // patchData.kategori = extracted.kategori;
      }
      Object.assign(patchData, extracted as any);
      // Hapus kategori agar tidak menimpa data yang sudah ada di UI (Kelompok Kasus)
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
    // Jalankan persist tanpa menunggu re-render yang memblokir klik tab lain
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

  const handleExtract = async (isSync = false) => {
    if (field !== "pci_report_link" || !isGoogleDocs || (isExtracting && !isSync)) return;
    if (!previewDocId) return;

    setIsExtracting(true);
    setExtractProgress(10);

    if (!isSync) {
      toast.info("Mengekstrak data dari Google Docs...", {
        description: "Mohon tunggu sebentar.",
      });
    }

    // Simulasi progress bar
    const interval = setInterval(() => {
      setExtractProgress((prev) => {
        const next = prev >= 90 ? prev : prev + 15;
        return next;
      });
    }, 150);

    try {
      // Panggil API Fetch Doc untuk mendapatkan data real dari Google Drive
      const res = await fetch(
        `/api/system/fetch-doc?docId=${encodeURIComponent(previewDocId)}`,
      );
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghubungi API ekstraksi.");
      }

      const { data: extracted } = await res.json();
      
      if (!extracted || Object.keys(extracted).length === 0) {
        throw new Error("Tidak ada data klinis yang ditemukan dalam laporan ini.");
      }

      // Ambil data tindakan saat ini dari DB untuk mencegah menimpa field yang sudah diedit manual
      let currentData: Record<string, any> = {};
      try {
        const currentRes = await fetch(`/api/tindakan/${encodeURIComponent(tindakanId)}`);
        if (currentRes.ok) {
          const json = await currentRes.json();
          if (json.ok && json.data) {
            currentData = json.data;
          }
        }
      } catch (err) {
        console.warn("[KlinisAutosaveField] Gagal mengambil data tindakan untuk filter ekstraksi:", err);
      }

      // Hanya simpan data ekstraksi untuk field yang masih kosong di database
      const filteredExtracted: Record<string, string | null> = {};
      for (const [key, val] of Object.entries(extracted)) {
        const currentVal = currentData[key];
        const isEmpty =
          currentVal === null ||
          currentVal === undefined ||
          String(currentVal).trim() === "" ||
          String(currentVal).trim() === "—" ||
          String(currentVal).trim() === "-";

        if (isEmpty) {
          filteredExtracted[key] = val as string | null;
        }
      }

      // Jalankan persist dengan data hasil ekstraksi real yang telah difilter
      await persist(draft, filteredExtracted);
      clearInterval(interval);

      setExtractProgress(100);

      setTimeout(() => {
        setIsExtracting(false);
        setExtractProgress(0);
        
        if (!isSync) {
          toast.success("Ekstraksi Berhasil!", {
            description: "Data klinis telah diperbarui dari Google Drive.",
          });
        }
        
        onSaved?.(); // Memicu refresh SWR di parent
      }, isSync ? 400 : 800);

    } catch (e: any) {
      clearInterval(interval);
      setIsExtracting(false);
      setExtractProgress(0);
      
      if (!isSync) {
        toast.error("Gagal Ekstraksi", {
          description: e.message,
        });
      }
    }
  };

  const isGoogleDocs = draft.includes("docs.google.com");

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
          : "Hasil lab PPM";

  if (field === "pci_report_link") {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative">
          <div className="flex gap-2">
            <input
              type="url"
              autoComplete="off"
              className={cn(
                inputClass,
                isExtracting && "border-cyan-500 ring-1 ring-cyan-500/20"
              )}
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
              onClick={() => handleExtract(false)}
              disabled={!isGoogleDocs || isExtracting}
              className="flex shrink-0 items-center gap-2 rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50 dark:bg-cyan-700 dark:hover:bg-cyan-600"
            >
              {isExtracting ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Wand2 size={14} />
              )}
              {isExtracting ? "Proses..." : "Ekstrak"}
            </button>
          </div>

          {/* Visual Progress Bar - Menempel di pinggiran bawah Input */}
          {isExtracting && (
            <div className="absolute -bottom-[1px] left-0 h-[2px] w-full overflow-hidden rounded-b-md px-[1px]">
              <div
                className="h-full bg-cyan-500 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                style={{ width: `${extractProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Area Pratinjau (Review Panel) - Sekarang di bawah Input */}
        <div
          className={cn(
            "flex h-[min(780px,68dvh)] min-h-[560px] flex-col rounded-lg border transition-all duration-300",
            "border-cyan-500/20 bg-zinc-900/30 p-3",
            !isGoogleDocs && "opacity-40 grayscale-[0.5]",
          )}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/80">
              Pratinjau Laporan
            </p>
            <div className="flex items-center gap-2">
              {isGoogleDocs && previewDocId ? (
                <div
                  className="flex items-center gap-0.5 rounded-md border border-cyan-500/30 bg-black/35 p-0.5"
                  role="group"
                  aria-label="Zoom pratinjau laporan"
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
                </div>
              ) : null}
              {isGoogleDocs && (
                <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-bold text-cyan-400">
                  Google Docs
                </span>
              )}
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-auto rounded-lg border border-cyan-500/30 bg-black/40 shadow-inner">
            {isGoogleDocs && previewDocId ? (
              <iframe
                src={`https://docs.google.com/document/d/${previewDocId}/preview`}
                className="block max-w-none border-none bg-white"
                title="PCI Report Preview"
                allow="autoplay"
                style={{
                  width: `${previewZoom * 100}%`,
                  height: `${Math.round(PREVIEW_IFRAME_BASE_HEIGHT_PX * previewZoom)}px`,
                }}
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

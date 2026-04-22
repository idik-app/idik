"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Eye,
  ImagePlus,
  Loader2,
  RotateCcw,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { compressImageForUpload } from "../lib/compressImageForUpload";
import { parseFastTrackFotosUrls } from "../lib/fastTrackFotos";
import { UI_LAYERS } from "@/lib/ui/layers";

type Props = {
  tindakanId: string;
  fotosValue: unknown;
  canEdit: boolean;
  onSaved?: () => void;
  appearance?: "default" | "table";
  /** Panel abu lembut di drawer (kontras rendah, teks terang). */
  drawerMuted?: boolean;
};

export default function FastTrackPhotoDropzone({
  tindakanId,
  fotosValue,
  canEdit,
  onSaved,
  appearance = "default",
  drawerMuted = false,
}: Props) {
  const isTable = appearance === "table";
  const [urls, setUrls] = useState<string[]>(() =>
    parseFastTrackFotosUrls(fotosValue),
  );
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setUrls(parseFastTrackFotosUrls(fotosValue));
  }, [fotosValue, tindakanId]);

  useEffect(() => {
    if (previewUrl) setZoom(1);
  }, [previewUrl]);

  const patchFotos = useCallback(
    async (next: string[]) => {
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fast_track_fotos: next.length > 0 ? JSON.stringify(next) : null,
          }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      setUrls(next);
      onSaved?.();
    },
    [tindakanId, onSaved],
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!canEdit || !tindakanId) return;
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (list.length === 0) {
        setError("Pilih file gambar (JPG, PNG, WEBP, GIF).");
        return;
      }
      setError(null);
      setUploading(true);
      try {
        for (const file of list) {
          const prepared = await compressImageForUpload(file);
          const fd = new FormData();
          fd.set("file", prepared);
          const res = await fetch(
            `/api/tindakan/${encodeURIComponent(tindakanId)}/fast-track-foto`,
            {
              method: "POST",
              credentials: "include",
              body: fd,
            },
          );
          const json = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            message?: string;
            fotos?: string[];
          };
          if (!res.ok || !json.ok) {
            throw new Error(json.message || res.statusText);
          }
          if (Array.isArray(json.fotos)) {
            setUrls(json.fotos);
          }
        }
        onSaved?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gagal mengunggah.";
        setError(msg);
      } finally {
        setUploading(false);
      }
    },
    [canEdit, tindakanId, onSaved],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (!canEdit || uploading) return;
      void uploadFiles(e.dataTransfer.files);
    },
    [canEdit, uploading, uploadFiles],
  );

  const onRemove = useCallback(
    async (url: string) => {
      if (!canEdit || uploading) return;
      setError(null);
      const next = urls.filter((u) => u !== url);
      try {
        await patchFotos(next);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gagal menghapus.";
        setError(msg);
      }
    },
    [canEdit, uploading, urls, patchFotos],
  );

  const hasPhotos = urls.length > 0;

  const zoneClass = cn(
    "relative flex flex-col rounded-xl border-2 border-dashed text-center transition-colors",
    isTable
      ? hasPhotos
        ? "min-h-[3rem] overflow-hidden p-0.5"
        : "min-h-[3rem] items-center justify-center p-1"
      : hasPhotos
        ? "min-h-[13rem] overflow-hidden p-1"
        : "min-h-[11rem] px-3 py-4",
    drawerMuted && !isTable
      ? canEdit && !uploading
        ? dragOver
          ? "border-[#2C3E50] bg-[#98A6B5]"
          : "border-[#4A5568] bg-[#B8C5D3] hover:border-[#2C3E50]/65"
        : "border-[#5C6573]/80 bg-[#A8B4C2]/95"
      : canEdit && !uploading
        ? dragOver
          ? "border-cyan-500 bg-cyan-50/80 dark:border-cyan-400 dark:bg-cyan-950/30"
          : "border-cyan-300/70 bg-white/80 hover:border-cyan-400/80 dark:border-cyan-800/50 dark:bg-black/20 dark:hover:border-cyan-600/50"
        : "border-slate-200 bg-slate-50/50 dark:border-cyan-900/40 dark:bg-black/15",
  );

  return (
    <div className={cn("flex min-w-0 flex-col", isTable ? "gap-0" : "gap-2")}>
      {!isTable && (
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            drawerMuted ? "text-[#2C3E50]" : "text-slate-600 dark:text-white",
          )}
        >
          Foto dokumentasi
        </p>
      )}
      <div
        role="region"
        aria-label="Unggah foto Fast-Track"
        className={zoneClass}
        onDragEnter={(e) => {
          e.preventDefault();
          if (canEdit && !uploading) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (canEdit && !uploading) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOver(false);
          }
        }}
        onDrop={onDrop}
      >
        {uploading ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2",
              isTable ? "min-h-[3rem] flex-1" : "min-h-[10rem] flex-1",
              hasPhotos && "absolute inset-0 z-20 rounded-md",
              hasPhotos &&
                "bg-white/85 dark:bg-black/75 dark:backdrop-blur-[2px]",
            )}
          >
            <Loader2
              className={cn(
                isTable ? "h-4 w-4" : "h-8 w-8",
                "animate-spin",
                "text-cyan-600 dark:text-white",
              )}
              aria-hidden
            />
            {!isTable && (
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  "text-slate-700 dark:text-white",
                )}
              >
                Mengompresi & mengunggah…
              </span>
            )}
          </div>
        ) : null}

        {hasPhotos ? (
          <div
            className={cn(
              "relative flex w-full flex-1 flex-col overflow-hidden rounded-md",
              isTable ? "min-h-0" : "min-h-[11rem]",
              !uploading && "min-h-0",
            )}
          >
            <div
              className={cn(
                "grid flex-1 gap-1 overflow-y-auto p-0.5",
                isTable ? "grid-cols-2" : urls.length === 1 ? "grid-cols-1" : "grid-cols-2",
                !isTable && "min-h-[11rem]",
              )}
            >
              {urls.map((u) => (
                <div
                  key={u}
                  className={cn(
                    "relative overflow-hidden rounded-md",
                    isTable
                      ? "h-10 w-10 sm:h-12 sm:w-12"
                      : urls.length === 1 ? "min-h-[11rem]" : "min-h-[5rem]",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u}
                    alt="Dokumentasi Fast-Track"
                    className={cn(
                      "relative z-0 pointer-events-none h-full w-full object-cover",
                      !isTable && (urls.length === 1 ? "min-h-[11rem]" : "min-h-[5rem]"),
                    )}
                    loading="lazy"
                  />
                  <button
                    type="button"
                    title="Lihat & zoom"
                    aria-label="Buka pratinjau foto"
                    disabled={uploading}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewUrl(u);
                    }}
                    className={cn(
                      "absolute left-0.5 top-0.5 z-30 flex items-center justify-center rounded border shadow-sm transition-opacity",
                      isTable ? "h-5 w-5" : "h-7 w-7",
                      "opacity-95 hover:opacity-100 disabled:opacity-40",
                    "border-cyan-300/80 bg-white/95 text-cyan-800 hover:bg-cyan-50 dark:border-cyan-600/50 dark:bg-black/80 dark:text-white dark:hover:bg-cyan-950/90",
                    )}
                  >
                    <Eye className={isTable ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} />
                  </button>
                  {canEdit ? (
                    <button
                      type="button"
                      title="Hapus foto"
                      aria-label="Hapus foto"
                      disabled={uploading}
                      onClick={(e) => {
                        e.stopPropagation();
                        void onRemove(u);
                      }}
                      className={cn(
                        "absolute right-0.5 top-0.5 z-10 flex items-center justify-center rounded border shadow-sm transition-opacity",
                        isTable ? "h-5 w-5" : "h-7 w-7",
                        "opacity-95 hover:opacity-100 disabled:opacity-40",
                        "border-red-200 bg-white/95 text-red-700 dark:border-red-900/60 dark:bg-black/80 dark:text-red-300",
                      )}
                    >
                      <Trash2 className={isTable ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} />
                    </button>
                  ) : null}
                </div>
              ))}
              {isTable && canEdit && !uploading && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-cyan-400 bg-cyan-50/50 text-cyan-600 hover:bg-cyan-100 dark:border-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400 sm:h-12 sm:w-12"
                  title="Tambah foto"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
              )}
            </div>

            {!isTable && canEdit && !uploading ? (
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 bg-gradient-to-t px-2 pb-2 pt-10",
                  "from-white via-white/95 to-transparent dark:from-black/90 dark:via-black/70 dark:to-transparent",
                )}
              >
                <p
                  className={cn(
                    "pointer-events-none text-[10px] font-semibold",
                    "text-slate-700 dark:text-white",
                  )}
                >
                  Seret lagi untuk menambah · atau
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    "pointer-events-auto rounded-md border px-2.5 py-1 text-[10px] font-bold transition-colors",
                    "border-cyan-500/45 bg-white text-cyan-900 shadow-sm hover:bg-cyan-50 dark:border-cyan-500/40 dark:bg-cyan-950/90 dark:text-white dark:hover:bg-cyan-900/90",
                  )}
                >
                  Pilih file
                </button>
                <p
                  className={cn(
                    "pointer-events-none text-[9px] font-medium",
                    "text-slate-500 dark:text-white/90",
                  )}
                >
                  Maks. 500 KB/foto (JPEG otomatis)
                </p>
              </div>
            ) : null}
          </div>
        ) : !uploading ? (
          <div className={cn("flex flex-col items-center justify-center gap-2", isTable ? "py-0.5" : "py-1")}>
            <ImagePlus
              className={cn(
                isTable ? "h-4 w-4" : "h-8 w-8",
                drawerMuted && !isTable
                  ? "text-white"
                  : "text-cyan-600/80 dark:text-white",
              )}
              aria-hidden
            />
            {!isTable ? (
              <>
                <p
                  className={cn(
                    "text-[11px] font-semibold leading-snug",
                    drawerMuted
                      ? "text-[#2C3E50]"
                      : "text-slate-800 dark:text-cyan-100/90",
                  )}
                >
                  {canEdit
                    ? "Seret & lepas foto di sini"
                    : "Unggah tidak tersedia tanpa ID kasus"}
                </p>
                <p
                  className={cn(
                    "text-[10px] font-medium",
                    drawerMuted ? "text-white/85" : "text-slate-500 dark:text-white/90",
                  )}
                >
                  Otomatis dikompresi maks. 500 KB (JPEG) · seret JPG/PNG/WEBP/GIF
                </p>
              </>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "rounded-lg border px-2 py-0.5 font-bold transition-colors disabled:opacity-50",
                  isTable ? "text-[8px]" : "mt-1 px-2.5 py-1 text-[10px]",
                  drawerMuted && !isTable
                    ? "border-[#4A5568] bg-[#D1D9E2] text-[#2C3E50] hover:bg-[#C5CEDA]"
                    : "border-cyan-500/40 bg-cyan-50 text-cyan-900 hover:bg-cyan-100 dark:border-cyan-500/35 dark:bg-cyan-950/40 dark:text-cyan-200 dark:hover:bg-cyan-900/40",
                )}
              >
                {isTable ? "Upload" : "Pilih file"}
              </button>
            ) : null}
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const fl = e.target.files;
            e.target.value = "";
            if (fl?.length) void uploadFiles(fl);
          }}
        />
      </div>

      {error ? (
        <p
          className={cn(
            "rounded-md border px-2 py-1.5 text-[10px] font-semibold",
            "border-red-300 bg-red-50 text-red-900 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-200",
          )}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Dialog
        open={Boolean(previewUrl)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewUrl(null);
            setZoom(1);
          }
        }}
      >
        <DialogContent
          overlayClassName={`!${UI_LAYERS.dialogOverlayTop}`}
          className={cn(
            `!${UI_LAYERS.dialogContentTop} !max-h-[min(92dvh,760px)] !w-[min(96vw,900px)] !max-w-[min(96vw,900px)] !translate-x-[-50%] !translate-y-[-50%] gap-0 overflow-hidden p-0`,
          "!border-cyan-400/50 !bg-white !text-slate-900 dark:!border-cyan-500/40 dark:!bg-zinc-950 dark:!text-white",
          )}
        >
          <DialogTitle className="sr-only">Pratinjau foto dokumentasi</DialogTitle>
          <div
            className={cn(
              "flex items-center justify-between gap-2 border-b px-3 py-2",
            "border-cyan-200/80 bg-slate-50 dark:border-cyan-900/50 dark:bg-black/50",
            )}
          >
            <span className="text-xs font-bold">Pratinjau</span>
            <div className="flex flex-wrap items-center justify-end gap-1">
              <button
                type="button"
                title="Perkecil"
                aria-label="Zoom out"
                onClick={() =>
                  setZoom((z) => Math.max(0.25, Math.round((z - 0.25) * 100) / 100))
                }
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm font-bold transition-colors",
                  "border-cyan-400/50 bg-white hover:bg-cyan-50 dark:border-cyan-700/50 dark:bg-black/40 dark:hover:bg-cyan-950/60",
                )}
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span
                className={cn(
                  "min-w-[3.25rem] text-center font-mono text-[11px] font-semibold tabular-nums",
                  "text-slate-600 dark:text-cyan-300/90",
                )}
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                title="Perbesar"
                aria-label="Zoom in"
                onClick={() =>
                  setZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100))
                }
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm font-bold transition-colors",
                  "border-cyan-400/50 bg-white hover:bg-cyan-50 dark:border-cyan-700/50 dark:bg-black/40 dark:hover:bg-cyan-950/60",
                )}
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Tampilkan seluruh foto"
                aria-label="Reset zoom — tampilkan seluruh foto"
                onClick={() => setZoom(1)}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                  "border-cyan-400/50 bg-white hover:bg-cyan-50 dark:border-cyan-700/50 dark:bg-black/40 dark:hover:bg-cyan-950/60",
                )}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                title="Tutup"
                aria-label="Tutup pratinjau"
                onClick={() => {
                  setPreviewUrl(null);
                  setZoom(1);
                }}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                  "border-slate-300/80 bg-white text-slate-800 hover:bg-slate-100 dark:border-cyan-800/50 dark:bg-black/50 dark:text-white dark:hover:bg-cyan-950/70",
                )}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <div
            className={cn(
              "max-h-[min(78dvh,640px)] w-full overflow-auto overscroll-contain",
            "bg-slate-100/90 dark:bg-black/80",
            )}
          >
            {previewUrl ? (
              <div className="flex min-h-[min(52dvh,360px)] w-full items-center justify-center p-3 sm:min-h-[min(60dvh,420px)] sm:p-4">
                <div
                  className="inline-block origin-center will-change-transform"
                  style={{
                    transform: `scale(${zoom})`,
                    transition: "transform 0.15s ease-out",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Pratinjau dokumentasi"
                    className="block h-auto w-auto max-h-[min(62dvh,560px)] max-w-[min(92vw,860px)] object-contain select-none"
                    draggable={false}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

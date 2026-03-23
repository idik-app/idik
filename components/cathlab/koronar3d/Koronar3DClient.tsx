"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Undo2,
  Camera,
  Trash2,
  Save,
  FileDown,
  Loader2,
  FilePlus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Paintbrush,
  Blend,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportKoronarPdfFromDataUrl } from "@/lib/cathlab/exportKoronarPdf";
import type { KoronarPayloadV1 } from "@/lib/cathlab/koronarPayload";
import { parseKoronarPayload } from "@/lib/cathlab/koronarPayload";
import { KORONAR_TEMPLATES } from "@/lib/cathlab/koronarTemplates";
import { CORONARY_SEGMENTS } from "./segmentData";
import type { AnnotationKind, SegmentAnnotation } from "./coronaryTypes";

const CoronaryScene = dynamic(() => import("./CoronaryScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(520px,70vh)] w-full items-center justify-center rounded-lg border border-cyan-900/40 bg-[#0a1018] text-cyan-500/80">
      Memuat viewer 3D…
    </div>
  ),
});

/** UUID atau id numerik pasien (sesuai kolom di DB). */
const PASIEN_ID_RE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|\d+)$/i;

type HistorySnap = Record<string, SegmentAnnotation>;

type SavedRow = {
  id: string;
  title: string | null;
  pasien_id: string | null;
  tindakan_id: string | null;
  template_id: string;
  created_at: string;
  updated_at: string;
  payload: unknown;
};

type TindakanHariIniRow = {
  id: string;
  tanggal: string | null;
  waktu: string | null;
  nama_pasien: string | null;
  no_rm: string | null;
  tindakan: string | null;
  kategori: string | null;
  status: string | null;
  ruangan: string | null;
  pasien_id: string | null;
};

function buildPayload(
  annotations: HistorySnap,
  paintMode: AnnotationKind,
  opacity: number
): KoronarPayloadV1 {
  return {
    version: 1,
    annotations,
    paintMode,
    opacity,
  };
}

export default function Koronar3DClient() {
  const [annotations, setAnnotations] = useState<HistorySnap>({});
  const [history, setHistory] = useState<HistorySnap[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paintMode, setPaintMode] = useState<AnnotationKind>("lesion");
  const [opacity, setOpacity] = useState(0.82);
  const [focusSegmentId, setFocusSegmentId] = useState<string | null>(null);
  const [focusRev, setFocusRev] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [floatDrawOpen, setFloatDrawOpen] = useState(true);

  const [title, setTitle] = useState("");
  const [pasienId, setPasienId] = useState("");
  const [tindakanId, setTindakanId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string>("standard-v1");
  const [tindakanHariIni, setTindakanHariIni] = useState<TindakanHariIniRow[]>(
    []
  );
  const [tindakanTanggal, setTindakanTanggal] = useState<string>("");
  const [tindakanLoading, setTindakanLoading] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [savedRows, setSavedRows] = useState<SavedRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [loadSelectEpoch, setLoadSelectEpoch] = useState(0);

  const onCameraPresetDone = useCallback(() => setCameraPreset(null), []);

  const refreshList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/cathlab/koronar-annotation", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Gagal memuat daftar");
      }
      setSavedRows(data.rows ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuat daftar";
      toast.error(msg);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const refreshTindakanHariIni = useCallback(async () => {
    setTindakanLoading(true);
    try {
      const res = await fetch("/api/cathlab/tindakan-hari-ini", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Gagal memuat tindakan");
      }
      const rows = (data.rows ?? []) as Record<string, unknown>[];
      setTindakanHariIni(
        rows.map((r) => ({
          ...r,
          id: String(r.id ?? ""),
        })) as TindakanHariIniRow[]
      );
      setTindakanTanggal(data.tanggal ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat tindakan");
    } finally {
      setTindakanLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTindakanHariIni();
  }, [refreshTindakanHariIni]);

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-19), { ...annotations }]);
  }, [annotations]);

  const onApplyAnnotation = useCallback(
    (segmentId: string, kind: AnnotationKind) => {
      pushHistory();
      setAnnotations((prev) => ({
        ...prev,
        [segmentId]: { kind, opacity },
      }));
    },
    [opacity, pushHistory]
  );

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) {
        toast.message("Tidak ada langkah untuk di-undo");
        return h;
      }
      const prev = h[h.length - 1];
      setAnnotations(prev);
      return h.slice(0, -1);
    });
  }, []);

  const clearSelected = useCallback(() => {
    if (!selectedId) {
      toast.message("Pilih segmen di model terlebih dahulu");
      return;
    }
    pushHistory();
    setAnnotations((prev) => {
      const next = { ...prev };
      delete next[selectedId];
      return next;
    });
  }, [selectedId, pushHistory]);

  const selectedSeg = useMemo(
    () => CORONARY_SEGMENTS.find((s) => s.id === selectedId),
    [selectedId]
  );

  /** Tindakan terpilih tidak ada di daftar hari ini (mis. dimuat dari catatan lama). */
  const tindakanOptions = useMemo(() => {
    const list = [...tindakanHariIni];
    if (
      tindakanId &&
      !list.some((r) => r.id === tindakanId)
    ) {
      list.unshift({
        id: tindakanId,
        tanggal: null,
        waktu: null,
        nama_pasien: "Tindakan (disimpan)",
        no_rm: null,
        tindakan: title || "—",
        kategori: null,
        status: null,
        ruangan: null,
        pasien_id: pasienId || null,
      });
    }
    return list;
  }, [tindakanHariIni, tindakanId, title, pasienId]);

  const applyOpacityToSelected = useCallback(() => {
    if (!selectedId || !annotations[selectedId]) {
      toast.message("Pilih segmen yang sudah dianotasi");
      return;
    }
    pushHistory();
    setAnnotations((prev) => ({
      ...prev,
      [selectedId]: {
        ...prev[selectedId]!,
        opacity,
      },
    }));
  }, [selectedId, annotations, opacity, pushHistory]);

  const handleSave = useCallback(async () => {
    if (!tindakanId) {
      toast.error("Pilih tindakan pasien hari ini terlebih dahulu");
      return;
    }

    const raw = pasienId.trim();
    let pid: string | null = null;
    if (raw) {
      if (!PASIEN_ID_RE.test(raw)) {
        toast.error("Pasien ID: UUID atau angka, atau kosongkan");
        return;
      }
      pid = raw;
    }

    const payload = buildPayload(annotations, paintMode, opacity);
    setSavePending(true);
    try {
      const res = await fetch("/api/cathlab/koronar-annotation", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recordId ?? undefined,
          title: title.trim() || null,
          pasien_id: pid,
          tindakan_id: tindakanId,
          template_id: templateId,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Gagal menyimpan");
      }
      if (data.id) setRecordId(data.id);
      toast.success(
        data.action === "created" ? "Catatan dibuat" : "Catatan diperbarui"
      );
      await refreshList();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan";
      if (msg.includes("503") || msg.toLowerCase().includes("service role")) {
        toast.error(
          "Server: pastikan SUPABASE_SERVICE_ROLE_KEY di .env dan migrasi DB sudah dijalankan."
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setSavePending(false);
    }
  }, [
    annotations,
    paintMode,
    opacity,
    recordId,
    title,
    pasienId,
    tindakanId,
    templateId,
    refreshList,
  ]);

  const handleLoadRow = useCallback(
    (id: string) => {
      const row = savedRows.find((r) => r.id === id);
      if (!row) return;
      const p = parseKoronarPayload(row.payload);
      if (!p) {
        toast.error("Payload catatan tidak valid");
        return;
      }
      setRecordId(row.id);
      setTitle(row.title ?? "");
      setPasienId(row.pasien_id ?? "");
      setTindakanId(
        row.tindakan_id != null ? String(row.tindakan_id) : null
      );
      setTemplateId(row.template_id || "standard-v1");
      setAnnotations(p.annotations);
      setPaintMode(p.paintMode);
      setOpacity(p.opacity);
      setHistory([]);
      setLoadSelectEpoch((n) => n + 1);
      toast.message("Catatan dimuat");
    },
    [savedRows]
  );

  const handleNewSession = useCallback(() => {
    setRecordId(null);
    setTitle("");
    setPasienId("");
    setTindakanId(null);
    setTemplateId("standard-v1");
    setAnnotations({});
    setHistory([]);
    setSelectedId(null);
    toast.message("Lembar baru — anotasi dikosongkan");
  }, []);

  const handleDeleteRecord = useCallback(async () => {
    if (!recordId) {
      toast.message("Tidak ada catatan aktif untuk dihapus");
      return;
    }
    if (!window.confirm("Hapus catatan ini dari server?")) return;
    try {
      const res = await fetch(`/api/cathlab/koronar-annotation/${recordId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Gagal menghapus");
      }
      toast.success("Catatan dihapus");
      handleNewSession();
      await refreshList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }, [recordId, handleNewSession, refreshList]);

  const handleExportPdf = useCallback(() => {
    const host = document.getElementById("koronar-r3f-canvas-host");
    const canvas = host?.querySelector("canvas");
    if (!canvas) {
      toast.error("Canvas 3D belum siap");
      return;
    }
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const name = `koronar-${new Date().toISOString().slice(0, 10)}.pdf`;
      const pdfTitle = title.trim() || "Anotasi koronar 3D";
      exportKoronarPdfFromDataUrl(dataUrl, name, {
        title: pdfTitle,
      });
      toast.success("PDF diunduh");
    } catch (e) {
      console.error(e);
      toast.error(
        "Gagal menangkap gambar. Coba orbit view sebentar lalu ulangi."
      );
    }
  }, [title]);

  return (
    <div className="flex min-h-0 flex-col gap-4 text-gray-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/30 pb-3">
        <div>
          <h1 className="text-lg font-semibold text-cyan-100 md:text-xl">
            Anotasi koronar 3D
          </h1>
          <p className="text-sm text-gray-400">
            Pilih tindakan hari ini + template, lalu arsir segmen. Model
            referensi, bukan CT pasien.
          </p>
          {recordId && (
            <p className="mt-1 text-xs text-cyan-500/80">
              Catatan aktif:{" "}
              <code className="text-cyan-300/90">{recordId.slice(0, 8)}…</code>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={savePending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-700/50 bg-cyan-950/40 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-900/40 disabled:opacity-50"
          >
            {savePending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Simpan
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600/60 bg-gray-900/50 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800/60"
          >
            <FileDown size={16} /> Ekspor PDF
          </button>
        </div>
      </header>

      <div className="flex min-h-[320px] w-full min-w-0 flex-col gap-3 lg:h-[min(520px,70vh)] lg:flex-row lg:gap-1 lg:overflow-x-auto">
        <div
          id="koronar-r3f-canvas-host"
          className="relative min-h-[280px] min-w-0 flex-1 lg:min-h-0"
        >
          <CoronaryScene
            annotations={annotations}
            selectedId={selectedId}
            paintMode={paintMode}
            onSelectSegment={setSelectedId}
            onApplyAnnotation={onApplyAnnotation}
            focusSegmentId={focusSegmentId}
            focusRev={focusRev}
            cameraPreset={cameraPreset}
            onCameraPresetDone={onCameraPresetDone}
          />
          {!sidePanelOpen && (
            <button
              type="button"
              onClick={() => setSidePanelOpen(true)}
              className="absolute right-0 top-1/2 z-10 flex h-12 w-8 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-cyan-900/50 bg-[#0d141f]/95 text-cyan-400 shadow-md hover:bg-cyan-950/60 hover:text-cyan-200"
              title="Tampilkan panel"
              aria-label="Tampilkan panel samping"
            >
              <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
            </button>
          )}

          {/* Toolbar menggambar mengambang — di atas canvas, tidak ikut scroll sidebar */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-2 pb-3 pt-10">
            <div className="pointer-events-auto flex max-w-full flex-col items-stretch gap-2 sm:items-center">
              {!floatDrawOpen ? (
                <button
                  type="button"
                  onClick={() => setFloatDrawOpen(true)}
                  className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-800/60 bg-[#0c121a]/95 px-4 py-2 text-sm text-cyan-200 shadow-xl backdrop-blur-md transition hover:border-cyan-600/60 hover:bg-cyan-950/50"
                  title="Buka alat arsir"
                >
                  <Paintbrush className="h-4 w-4 text-cyan-400" aria-hidden />
                  Alat arsir
                  <ChevronUp className="h-4 w-4 text-cyan-500/80" aria-hidden />
                </button>
              ) : (
                <div
                  role="toolbar"
                  aria-label="Alat arsir koronar"
                  className="mx-auto flex w-full max-w-[min(100%,36rem)] flex-wrap items-center justify-center gap-x-2 gap-y-2 rounded-2xl border border-cyan-800/50 bg-[#0c121a]/95 px-3 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-md"
                >
                  <div className="flex items-center gap-1.5 border-r border-cyan-900/40 pr-2">
                    <Paintbrush
                      className="h-4 w-4 shrink-0 text-cyan-500/90"
                      aria-hidden
                    />
                    <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-cyan-500/80 sm:inline">
                      Arsir
                    </span>
                  </div>

                  <div className="flex rounded-lg border border-gray-700/60 bg-gray-950/60 p-0.5">
                    <button
                      type="button"
                      onClick={() => setPaintMode("lesion")}
                      title="Mode lesi"
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                        paintMode === "lesion"
                          ? "bg-orange-950/80 text-orange-200 ring-1 ring-orange-600/50"
                          : "text-gray-400 hover:text-orange-200/90"
                      )}
                    >
                      Lesi
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintMode("stent")}
                      title="Mode stent"
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                        paintMode === "stent"
                          ? "bg-cyan-950/80 text-cyan-200 ring-1 ring-cyan-600/50"
                          : "text-gray-400 hover:text-cyan-200/90"
                      )}
                    >
                      Stent
                    </button>
                  </div>

                  <label className="flex min-w-[7rem] max-w-[10rem] flex-1 items-center gap-1.5 sm:min-w-[9rem]">
                    <Blend
                      className="h-3.5 w-3.5 shrink-0 text-gray-500"
                      aria-hidden
                    />
                    <input
                      type="range"
                      min={0.25}
                      max={0.95}
                      step={0.05}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="h-1.5 w-full min-w-0 flex-1 cursor-pointer accent-cyan-500"
                      title="Opacity untuk anotasi berikutnya"
                    />
                    <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-gray-400">
                      {opacity.toFixed(2)}
                    </span>
                  </label>

                  <div className="flex flex-wrap items-center justify-center gap-1 border-t border-cyan-900/30 pt-2 sm:border-t-0 sm:border-l sm:pl-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-600/50 bg-gray-900/50 px-2 py-1.5 text-[11px] text-gray-300 hover:bg-gray-800/70"
                      title="Undo"
                    >
                      <Undo2 className="h-3.5 w-3.5" aria-hidden />
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={clearSelected}
                      className="inline-flex items-center gap-1 rounded-md border border-red-900/45 bg-red-950/20 px-2 py-1.5 text-[11px] text-red-300/90 hover:bg-red-950/40"
                      title="Hapus anotasi segmen terpilih"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Hapus
                    </button>
                    <button
                      type="button"
                      onClick={applyOpacityToSelected}
                      className="inline-flex items-center gap-1 rounded-md border border-cyan-800/50 bg-cyan-950/30 px-2 py-1.5 text-[11px] text-cyan-200 hover:bg-cyan-950/55"
                      title="Terapkan opacity ke segmen terpilih"
                    >
                      Opacity
                    </button>
                    <button
                      type="button"
                      onClick={() => setFloatDrawOpen(false)}
                      className="ml-0.5 rounded-md p-1.5 text-cyan-500/70 hover:bg-cyan-950/50 hover:text-cyan-300"
                      title="Sembunyikan toolbar"
                      aria-label="Sembunyikan toolbar arsir"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSidePanelOpen(false)}
          className={cn(
            "flex w-full shrink-0 items-center justify-center gap-2 border-y border-cyan-900/40 bg-[#0a1018]/90 py-1.5 text-xs text-cyan-500/90 hover:bg-cyan-950/40 lg:hidden",
            !sidePanelOpen && "hidden"
          )}
          title="Sembunyikan panel"
          aria-label="Sembunyikan panel samping"
        >
          <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
          Sembunyikan panel
        </button>

        <button
          type="button"
          onClick={() => setSidePanelOpen(false)}
          className={cn(
            "hidden shrink-0 self-stretch border-y border-cyan-900/40 bg-[#0a1018]/90 px-0.5 text-cyan-500/90 hover:bg-cyan-950/50 hover:text-cyan-300 lg:flex lg:items-center",
            !sidePanelOpen && "lg:hidden"
          )}
          title="Sembunyikan panel"
          aria-expanded={sidePanelOpen}
          aria-label="Sembunyikan panel samping"
        >
          <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
        </button>

        <aside
          className={cn(
            "flex w-full shrink-0 flex-col gap-4 transition-all duration-200 ease-out lg:w-80 lg:min-w-[18rem] lg:max-w-[min(22rem,100%)] lg:flex-shrink-0 lg:pr-1",
            sidePanelOpen
              ? "overflow-y-auto overflow-x-visible"
              : "pointer-events-none max-h-0 gap-0 overflow-hidden border-0 p-0 opacity-0 lg:max-h-[min(520px,70vh)] lg:w-0 lg:min-w-0 lg:max-w-0 lg:gap-0 lg:p-0 lg:opacity-0 lg:pr-0",
          )}
          aria-hidden={!sidePanelOpen}
        >
          <div className="rounded-lg border border-cyan-900/40 bg-[#0d141f]/90 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-500/90">
              Pasien & tindakan (hari ini, WIB)
            </h2>
            <p className="mb-2 text-[11px] text-gray-500">
              Tanggal daftar:{" "}
              <span className="text-cyan-600/90">
                {tindakanTanggal || "—"}
              </span>
              {tindakanLoading && " · memuat…"}
            </p>
            <label className="block text-xs text-gray-400">
              Tindakan hari ini <span className="text-red-400/90">*</span>
            </label>
            <select
              value={tindakanId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) {
                  setTindakanId(null);
                  setPasienId("");
                  return;
                }
                const row = tindakanHariIni.find((r) => r.id === v);
                setTindakanId(v);
                if (row) {
                  setPasienId(row.pasien_id ?? "");
                  setTitle((prev) => {
                    if (prev.trim()) return prev;
                    return `Anotasi — ${row.nama_pasien ?? "?"} — ${row.tindakan ?? ""}`.trim();
                  });
                }
              }}
              disabled={tindakanLoading && tindakanOptions.length === 0}
              className="mt-0.5 w-full rounded border border-gray-700/60 bg-gray-950/50 px-2 py-1.5 text-sm text-gray-100"
            >
              <option value="">
                {tindakanOptions.length === 0
                  ? "Belum ada tindakan hari ini"
                  : "— Pilih pasien / tindakan —"}
              </option>
              {tindakanOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {(r.nama_pasien ?? "?").slice(0, 28)}
                  {r.no_rm ? ` (${r.no_rm})` : ""} —{" "}
                  {(r.tindakan ?? "").slice(0, 36)}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs text-gray-400">
              Template koroner
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="mt-0.5 w-full rounded border border-gray-700/60 bg-gray-950/50 px-2 py-1.5 text-sm text-gray-100"
            >
              {KORONAR_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-500">
              Saat ini hanya satu model 3D; template menandai jenis lembar untuk
              laporan & ekspansi nanti.
            </p>

            <h2 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-cyan-500/90">
              Penyimpanan (Supabase)
            </h2>
            <label className="block text-xs text-gray-400">Judul</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="mis. Pre-PCI LAD"
              className="mt-0.5 w-full rounded border border-gray-700/60 bg-gray-950/50 px-2 py-1.5 text-sm text-gray-100 placeholder:text-gray-600"
            />
            <label className="mt-2 block text-xs text-gray-400">
              Pasien ID (otomatis dari tindakan; boleh lanjutan)
            </label>
            <input
              type="text"
              value={pasienId}
              onChange={(e) => setPasienId(e.target.value)}
              placeholder="terisi dari tindakan"
              className="mt-0.5 w-full rounded border border-gray-700/60 bg-gray-950/50 px-2 py-1.5 text-sm text-gray-100 placeholder:text-gray-600"
            />
            <label className="mt-2 block text-xs text-gray-400">
              Muat catatan
            </label>
            <div className="mt-1 flex gap-2">
              <select
                key={`${savedRows.map((r) => r.id).join("|")}-${loadSelectEpoch}`}
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) handleLoadRow(v);
                }}
                disabled={listLoading || savedRows.length === 0}
                className="min-w-0 flex-1 rounded border border-gray-700/60 bg-gray-950/50 px-2 py-1.5 text-sm text-gray-100"
              >
                <option value="">
                  {listLoading
                    ? "Memuat…"
                    : savedRows.length === 0
                      ? "Belum ada catatan"
                      : "Pilih…"}
                </option>
                {savedRows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.title || "Tanpa judul").slice(0, 40)}{" "}
                    — {new Date(r.updated_at).toLocaleString()}
                  </option>
                ))}
              </select>
              <button
                type="button"
                title="Catatan baru"
                onClick={handleNewSession}
                className="shrink-0 rounded border border-gray-600/50 p-1.5 text-gray-300 hover:bg-gray-800/60"
              >
                <FilePlus size={18} />
              </button>
            </div>
            {recordId && (
              <button
                type="button"
                onClick={handleDeleteRecord}
                className="mt-2 w-full rounded border border-red-900/40 py-1.5 text-xs text-red-300/90 hover:bg-red-950/30"
              >
                Hapus catatan di server
              </button>
            )}
          </div>

          <div className="rounded-lg border border-cyan-900/40 bg-[#0d141f]/90 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-500/90">
              Legenda
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-10 rounded border border-orange-500/50"
                  style={{
                    background:
                      "repeating-linear-gradient(135deg, #e07030 0, #e07030 4px, #b85520 4px, #b85520 8px)",
                  }}
                />
                <span>Lesi</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-10 rounded border border-cyan-500/50"
                  style={{
                    background:
                      "repeating-linear-gradient(0deg, #35b8f0 0, #35b8f0 3px, #2580b0 3px, #2580b0 6px)",
                  }}
                />
                <span>Stent</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-cyan-900/40 bg-[#0d141f]/90 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-cyan-500/90">
              Mode arsir
            </h2>
            <div className="flex gap-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="paint"
                  checked={paintMode === "lesion"}
                  onChange={() => setPaintMode("lesion")}
                  className="accent-orange-500"
                />
                <span>Lesi</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="paint"
                  checked={paintMode === "stent"}
                  onChange={() => setPaintMode("stent")}
                  className="accent-cyan-500"
                />
                <span>Stent</span>
              </label>
            </div>
            <div className="mt-4">
              <label className="text-xs text-gray-400">
                Opacity (baru diterapkan)
              </label>
              <input
                type="range"
                min={0.25}
                max={0.95}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="mt-1 w-full accent-cyan-500"
              />
              <p className="mt-1 text-xs text-gray-500">{opacity.toFixed(2)}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleUndo}
                className="inline-flex items-center gap-1 rounded border border-gray-600/50 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800/60"
              >
                <Undo2 size={14} /> Undo
              </button>
              <button
                type="button"
                onClick={clearSelected}
                className="inline-flex items-center gap-1 rounded border border-red-900/50 px-2 py-1 text-xs text-red-300/90 hover:bg-red-950/40"
              >
                <Trash2 size={14} /> Hapus anotasi
              </button>
              <button
                type="button"
                onClick={applyOpacityToSelected}
                className="inline-flex items-center gap-1 rounded border border-cyan-800/50 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-950/50"
              >
                Terapkan opacity
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-cyan-900/40 bg-[#0d141f]/90 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-500/90">
              Kamera
            </h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["depan", "Depan"],
                  ["samping", "Samping"],
                  ["atas", "Atas"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCameraPreset(id)}
                  className="inline-flex items-center gap-1 rounded border border-gray-600/50 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800/60"
                >
                  <Camera size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-cyan-900/40 bg-[#0d141f]/90 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-500/90">
              Segmen cepat
            </h2>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
              {CORONARY_SEGMENTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(s.id);
                    setFocusSegmentId(s.id);
                    setFocusRev((n) => n + 1);
                  }}
                  className={`rounded border px-2 py-0.5 text-xs transition-colors ${
                    selectedId === s.id
                      ? "border-cyan-500/70 bg-cyan-950/60 text-cyan-100"
                      : "border-gray-700/60 bg-gray-900/40 text-gray-300 hover:border-cyan-800/50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {selectedSeg && (
              <p className="mt-2 text-xs text-gray-500">
                Terpilih:{" "}
                <span className="text-cyan-200/90">{selectedSeg.label}</span>
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

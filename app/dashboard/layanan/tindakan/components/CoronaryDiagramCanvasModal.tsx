"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertCircle,
  Check,
  Download,
  Eraser,
  Grid,
  Hand,
  Hash,
  Loader2,
  Magnet,
  Maximize2,
  Minimize2,
  Pencil,
  PenTool,
  RotateCcw,
  RotateCw,
  Save,
  Type,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CoronaryTreeBaseSvg,
  CORONARY_VESSEL_ANCHORS,
} from "./CoronaryTreeBaseSvg";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";

type ToolMode = "hatch" | "pen" | "text" | "badge" | "pan" | "eraser" | "signature";

type ColorOption = "#ef4444" | "#2563eb" | "#0f172a" | "#eab308" | "#16a34a";

interface DrawStroke {
  id: string;
  tool: ToolMode;
  color: string;
  size: number;
  points: { x: number; y: number }[];
  text?: string;
  snappedVesselId?: string;
}

type Props = {
  open: boolean;
  tindakanId: string;
  initialUrl?: string | null;
  initialData?: Record<string, any> | string | null;
  onClose: () => void;
  onSaved?: (newUrl: string, summaryInfo?: { temuan?: string; plan?: string }) => void;
};

const LOCAL_DRAFT_KEY_PREFIX = "idik_coronary_draft_";

export default function CoronaryDiagramCanvasModal({
  open,
  tindakanId,
  initialUrl,
  initialData,
  onClose,
  onSaved,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [mountPoint, setMountPoint] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMountPoint((document.fullscreenElement as HTMLElement) || document.body);
    const handle = () => setMountPoint((document.fullscreenElement as HTMLElement) || document.body);
    document.addEventListener("fullscreenchange", handle);
    return () => document.removeEventListener("fullscreenchange", handle);
  }, []);

  const [tool, setTool] = useState<ToolMode>("hatch");
  const [color, setColor] = useState<ColorOption>("#ef4444");
  const [brushSize, setBrushSize] = useState<number>(4);
  const [useMagnet, setUseMagnet] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);

  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [redoStack, setRedoStack] = useState<DrawStroke[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [snappedVessel, setSnappedVessel] = useState<string | null>(null);

  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);

  const [saving, setSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Pan position
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Restore initial or local draft state
  useEffect(() => {
    if (!open) return;
    try {
      const localDraft = localStorage.getItem(`${LOCAL_DRAFT_KEY_PREFIX}${tindakanId}`);
      if (localDraft) {
        const parsed = JSON.parse(localDraft);
        if (Array.isArray(parsed.strokes)) {
          setStrokes(parsed.strokes);
          if (parsed.signatureDataUrl) setSignatureDataUrl(parsed.signatureDataUrl);
          return;
        }
      }
      if (initialData) {
        const parsedData = typeof initialData === "string" ? JSON.parse(initialData) : initialData;
        if (Array.isArray(parsedData.strokes)) {
          setStrokes(parsedData.strokes);
        }
        if (parsedData.signatureDataUrl) {
          setSignatureDataUrl(parsedData.signatureDataUrl);
        }
      }
    } catch {
      // Fallback empty strokes
    }
  }, [open, tindakanId, initialData]);

  // Auto-save draft to LocalStorage
  useEffect(() => {
    if (!tindakanId || strokes.length === 0) return;
    try {
      localStorage.setItem(
        `${LOCAL_DRAFT_KEY_PREFIX}${tindakanId}`,
        JSON.stringify({ strokes, signatureDataUrl, updatedAt: new Date().toISOString() })
      );
    } catch {
      // ignore quota exceeded
    }
  }, [strokes, signatureDataUrl, tindakanId]);

  // Find nearest vessel anchor for magnet snap
  const getNearestVessel = useCallback((x: number, y: number): string | null => {
    let minDistance = 45; // snap threshold px
    let matchedId: string | null = null;

    CORONARY_VESSEL_ANCHORS.forEach((anchor) => {
      // Sample points along path D roughly
      const coords = anchor.pathD.match(/\d+/g)?.map(Number);
      if (!coords) return;
      for (let i = 0; i < coords.length - 1; i += 2) {
        const vx = coords[i];
        const vy = coords[i + 1];
        const dist = Math.hypot(x - vx, y - vy);
        if (dist < minDistance) {
          minDistance = dist;
          matchedId = anchor.id;
        }
      }
    });

    return matchedId;
  }, []);

  // Redraw main canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved strokes
    strokes.forEach((stroke) => {
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "text" && stroke.text && stroke.points[0]) {
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
      } else if (stroke.tool === "badge" && stroke.text && stroke.points[0]) {
        const { x, y } = stroke.points[0];
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(x - 4, y - 18, ctx.measureText(stroke.text).width + 8, 22);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px monospace";
        ctx.fillText(stroke.text, x, y - 2);
      } else if (stroke.tool === "hatch") {
        // Draw cross-hatching pattern along points
        ctx.lineWidth = 2.5;
        for (let i = 0; i < stroke.points.length - 1; i += 4) {
          const pt = stroke.points[i];
          ctx.beginPath();
          ctx.moveTo(pt.x - 8, pt.y - 8);
          ctx.lineTo(pt.x + 8, pt.y + 8);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(pt.x + 8, pt.y - 8);
          ctx.lineTo(pt.x - 8, pt.y + 8);
          ctx.stroke();
        }
      } else {
        // Standard pen freehand
        ctx.beginPath();
        stroke.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }
      ctx.restore();
    });

    // Draw current active stroke
    if (isDrawing && currentPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";

      if (tool === "hatch") {
        ctx.lineWidth = 2.5;
        for (let i = 0; i < currentPoints.length - 1; i += 4) {
          const pt = currentPoints[i];
          ctx.beginPath();
          ctx.moveTo(pt.x - 8, pt.y - 8);
          ctx.lineTo(pt.x + 8, pt.y + 8);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(pt.x + 8, pt.y - 8);
          ctx.lineTo(pt.x - 8, pt.y + 8);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        currentPoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [strokes, isDrawing, currentPoints, tool, color, brushSize]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Handle pointer down on canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = 1000 / rect.width;
    const scaleY = 900 / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (tool === "text") {
      setTextPos({ x, y });
      return;
    }

    if (tool === "eraser") {
      // Remove strokes near point
      setStrokes((prev) =>
        prev.filter((s) => !s.points.some((p) => Math.hypot(p.x - x, p.y - y) < 25))
      );
      return;
    }

    let targetX = x;
    let targetY = y;
    let vesselId: string | null = null;

    if (useMagnet) {
      vesselId = getNearestVessel(x, y);
      setSnappedVessel(vesselId);
    }

    setIsDrawing(true);
    setCurrentPoints([{ x: targetX, y: targetY }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!isDrawing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = 1000 / rect.width;
    const scaleY = 900 / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let targetX = x;
    let targetY = y;

    if (useMagnet) {
      const vesselId = getNearestVessel(x, y);
      setSnappedVessel(vesselId);
    }

    setCurrentPoints((prev) => [...prev, { x: targetX, y: targetY }]);
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPoints.length > 0) {
      const newStroke: DrawStroke = {
        id: Math.random().toString(36).slice(2),
        tool: tool === "hatch" ? "hatch" : "pen",
        color,
        size: brushSize,
        points: currentPoints,
        snappedVesselId: snappedVessel || undefined,
      };
      setStrokes((prev) => [...prev, newStroke]);
      setRedoStack([]);
    }

    setCurrentPoints([]);
    setSnappedVessel(null);
  };

  // Add badge
  const addBadge = (text: string) => {
    const newStroke: DrawStroke = {
      id: Math.random().toString(36).slice(2),
      tool: "badge",
      color: "#0f172a",
      size: 14,
      points: [{ x: 500, y: 450 }],
      text,
    };
    setStrokes((prev) => [...prev, newStroke]);
    toast.success(`Badge "${text}" ditambahkan di tengah canvas. Geser atau edit jika perlu.`);
  };

  // Add text
  const handleAddTextSubmit = () => {
    if (!textInput.trim() || !textPos) return;
    const newStroke: DrawStroke = {
      id: Math.random().toString(36).slice(2),
      tool: "text",
      color,
      size: 16,
      points: [textPos],
      text: textInput.trim(),
    };
    setStrokes((prev) => [...prev, newStroke]);
    setTextInput("");
    setTextPos(null);
  };

  // Undo / Redo / Clear
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setRedoStack((prev) => [...prev, [last]]);
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setStrokes((prev) => [...prev, ...next]);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    setStrokes([]);
    setSignatureDataUrl(null);
    setShowClearConfirm(false);
    localStorage.removeItem(`${LOCAL_DRAFT_KEY_PREFIX}${tindakanId}`);
    toast.info("Canvas dan arsiran berhasil dibersihkan.");
  };

  // Export Combined Canvas Image & Save
  const handleSave = async () => {
    try {
      setSaving(true);

      // Render offscreen combined canvas (SVG Base + Strokes + Signature)
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = 1000;
      exportCanvas.height = 900;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) throw new Error("Gagal menginisialisasi canvas ekspor.");

      // Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1000, 900);

      // Render SVG onto Canvas
      const svgElement = containerRef.current?.querySelector("svg");
      if (svgElement) {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        ctx.drawImage(img, 0, 0, 1000, 900);
        URL.revokeObjectURL(url);
      }

      // Draw Main Canvas Overlay
      if (canvasRef.current) {
        ctx.drawImage(canvasRef.current, 0, 0, 1000, 900);
      }

      // Draw Signature Footer if present
      if (signatureDataUrl) {
        const sigImg = new Image();
        await new Promise((resolve) => {
          sigImg.onload = resolve;
          sigImg.src = signatureDataUrl;
        });
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(700, 780, 260, 100);
        ctx.strokeStyle = "#cbd5e1";
        ctx.strokeRect(700, 780, 260, 100);
        ctx.drawImage(sigImg, 710, 785, 240, 90);
      }

      // Export to WebP/PNG Data URL
      const dataUrl = exportCanvas.toDataURL("image/png", 0.95);

      // PATCH update via API
      const patchRes = await fetch(`/api/tindakan/${encodeURIComponent(tindakanId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skema_koroner_url: dataUrl,
          skema_koroner_data: {
            strokes,
            signatureDataUrl,
            savedAt: new Date().toISOString(),
          },
        }),
      });

      if (!patchRes.ok) {
        throw new Error("Gagal menyimpan skema koroner ke server.");
      }

      // Clear local draft upon successful save
      localStorage.removeItem(`${LOCAL_DRAFT_KEY_PREFIX}${tindakanId}`);

      toast.success("Skema Angiografi Koroner berhasil disimpan!");
      if (onSaved) onSaved(dataUrl);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  // Download High-Res PNG
  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = `skema_koroner_${tindakanId}.png`;
    a.click();
    toast.success("Gambar skema koroner berhasil diunduh.");
  };

  if (!open || !mountPoint) return null;

  const modalContent = (
    <div
      className="fixed inset-0 flex flex-col bg-slate-950/95 text-slate-100 backdrop-blur-md transition-all pointer-events-auto"
      style={{ zIndex: 100100 }}
    >
      {/* Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 sm:text-base">
              Editor Skema Angiografi Koroner
            </h2>
            <p className="text-xs text-slate-400">
              Formulir RM 20c • Interactive Canvas & Magnet Snapping
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Magnet Snap Toggle */}
          <button
            type="button"
            onClick={() => setUseMagnet(!useMagnet)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              useMagnet
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            )}
            title="Aktifkan magnet untuk arsiran otomatis menempel pada alur pembuluh"
          >
            <Magnet className="h-4 w-4" />
            <span>Magnet {useMagnet ? "ON" : "OFF"}</span>
          </button>

          {/* Download Image */}
          <button
            type="button"
            onClick={handleDownloadImage}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Unduh PNG</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Simpan</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Toolbar Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-2 text-xs">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setTool("hatch")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition",
              tool === "hatch"
                ? "bg-rose-600 text-white font-bold"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            )}
          >
            <Grid className="h-4 w-4" />
            <span>Arsir Stent</span>
          </button>

          <button
            type="button"
            onClick={() => setTool("pen")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition",
              tool === "pen"
                ? "bg-rose-600 text-white font-bold"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            )}
          >
            <Pencil className="h-4 w-4" />
            <span>Pen Lesi</span>
          </button>

          <button
            type="button"
            onClick={() => setTool("text")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition",
              tool === "text"
                ? "bg-rose-600 text-white font-bold"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            )}
          >
            <Type className="h-4 w-4" />
            <span>Teks Label</span>
          </button>

          <button
            type="button"
            onClick={() => setTool("eraser")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition",
              tool === "eraser"
                ? "bg-amber-600 text-white font-bold"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            )}
          >
            <Eraser className="h-4 w-4" />
            <span>Penghapus</span>
          </button>

          <button
            type="button"
            onClick={() => setTool("pan")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition",
              tool === "pan"
                ? "bg-indigo-600 text-white font-bold"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            )}
          >
            <Hand className="h-4 w-4" />
            <span>Geser (Pan)</span>
          </button>
        </div>

        {/* Color Palette & Presets */}
        <div className="flex items-center gap-3 py-1">
          {/* Colors */}
          <div className="flex items-center gap-1.5 border-r border-slate-700 pr-3">
            {[
              { hex: "#ef4444", label: "Merah Stenosis" },
              { hex: "#2563eb", label: "Biru Stent" },
              { hex: "#0f172a", label: "Hitam Text" },
              { hex: "#eab308", label: "Kuning Plak" },
            ].map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColor(c.hex as ColorOption)}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition",
                  color === c.hex ? "border-white scale-110 shadow-md" : "border-transparent opacity-80 hover:opacity-100"
                )}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>

          {/* Stenosis Quick Badges */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="text-[10px] text-slate-400">Badge Stenosis:</span>
            {["50%", "70%", "90%", "100%", "TIMI 3"].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => addBadge(b)}
                className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono font-semibold text-rose-300 hover:bg-slate-700"
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Undo, Redo, Zoom & Clear */}
        <div className="flex items-center gap-2 py-1">
          <div className="flex items-center gap-1 border-r border-slate-700 pr-2">
            <button
              type="button"
              disabled={strokes.length === 0}
              onClick={handleUndo}
              className="rounded p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              title="Undo"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              className="rounded p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              title="Redo"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-r border-slate-700 pr-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              className="rounded p-1.5 text-slate-300 hover:bg-slate-800"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-mono text-[11px] font-bold text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              className="rounded p-1.5 text-slate-300 hover:bg-slate-800"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1 rounded bg-rose-900/40 px-2.5 py-1 text-rose-300 hover:bg-rose-900/60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Canvas Area */}
      <div className="relative flex-1 overflow-hidden bg-slate-950 p-4">
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={cn(
            "relative mx-auto flex items-center justify-center transition-transform duration-75",
            tool === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
          )}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            touchAction: "none",
            width: "1000px",
            height: "900px",
          }}
        >
          {/* Base SVG Layer */}
          <div className="absolute inset-0 pointer-events-none">
            <CoronaryTreeBaseSvg
              width={1000}
              height={900}
              highlightVesselId={snappedVessel}
            />
          </div>

          {/* Interactive Drawing Canvas Layer */}
          <canvas
            ref={canvasRef}
            width={1000}
            height={900}
            className="absolute inset-0 pointer-events-auto"
          />

          {/* Text Input Popup when clicking tool === "text" */}
          {textPos && (
            <div
              className="absolute z-50 flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-2xl"
              style={{ left: textPos.x, top: textPos.y }}
            >
              <input
                type="text"
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTextSubmit()}
                placeholder="Ketik anotasi label..."
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white outline-none"
              />
              <button
                type="button"
                onClick={handleAddTextSubmit}
                className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setTextPos(null)}
                className="rounded bg-slate-800 p-1 text-slate-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Bersihkan Canvas?</h3>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Seluruh garis arsiran dan anotasi yang telah Anda buat pada skema koroner ini akan dihapus.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-500"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, mountPoint);
}

"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, Volume2, VolumeX, Flashlight, CheckCircle2 } from "lucide-react";
import { UI_LAYERS } from "@/lib/ui/layers";
import { parseGS1Barcode, ParsedGS1Data } from "@/lib/utils/gs1Parser";

const REGION_ID = "stok-opname-camera-scanner-region";

type Props = {
  open: boolean;
  onClose: () => void;
  onDecoded: (parsed: ParsedGS1Data) => void;
};

export default function ScanCameraModal({ open, onClose, onDecoded }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [lastScanned, setLastScanned] = useState<ParsedGS1Data | null>(null);

  const scannerRef = useRef<{ stop: () => Promise<unknown>; clear: () => void } | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;

  // Sound feedback using Web Audio API
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880; // A5 tone
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      /* ignore audio context restrictions */
    }
  };

  // Trigger vibration if supported
  const triggerVibration = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([80, 50, 80]);
    }
  };

  useEffect(() => {
    if (!open) return;

    setError(null);
    setLastScanned(null);
    let cancelled = false;
    let scanner: any = null;

    const handleDecodedText = (rawText: string) => {
      const now = Date.now();
      // Debounce anti double-scan (800ms)
      if (now - lastScanTimeRef.current < 800) return;
      lastScanTimeRef.current = now;

      const parsed = parseGS1Barcode(rawText);
      setLastScanned(parsed);

      if (soundEnabled) playBeep();
      triggerVibration();

      onDecodedRef.current(parsed);
    };

    void (async () => {
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const Html5Qrcode = mod.Html5Qrcode as any;
        const F = mod.Html5QrcodeSupportedFormats as any;

        scanner = new Html5Qrcode(REGION_ID, {
          verbose: false,
          formatsToSupport: [
            F.QR_CODE,
            F.DATA_MATRIX,
            F.CODE_128,
            F.EAN_13,
            F.EAN_8,
            F.CODE_39,
            F.CODABAR,
            F.UPC_A,
            F.UPC_E,
            F.PDF_417,
          ],
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode },
          { fps: 15, qrbox: { width: 280, height: 220 } },
          (decodedText: string) => handleDecodedText(decodedText),
          () => {}
        );
      } catch (e: unknown) {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? e.message
            : "Tidak dapat mengakses kamera HP. Pastikan izin kamera diberikan."
        );
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      void s
        .stop()
        .catch(() => {})
        .finally(() => {
          try {
            s.clear();
          } catch {
            /* ignore */
          }
        });
    };
  }, [open, facingMode, soundEnabled]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${UI_LAYERS.modalTop} flex items-center justify-center p-3 bg-black/80 backdrop-blur-md transition-opacity`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-[#0b1329] shadow-2xl overflow-hidden text-white dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-cyan-800/40 flex items-center justify-between bg-cyan-950/40">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-cyan-300" aria-hidden />
            <div>
              <h3 className="text-sm font-semibold text-white dark:text-white">
                Scanner Barcode Kamera HP
              </h3>
              <p className="text-[11px] text-white/85 dark:text-white/85">
                Pindai Barcode 1D, QR, atau GS1 DataMatrix Kemasan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder Section */}
        <div className="p-4 space-y-3">
          <div className="relative w-full rounded-xl bg-black/70 overflow-hidden border border-cyan-700/50 min-h-[220px]">
            <div id={REGION_ID} className="w-full h-full [&_video]:rounded-xl" />
            
            {/* Viewfinder Target Overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-48 border-2 border-dashed border-emerald-400/80 rounded-xl bg-emerald-500/5 animate-pulse flex items-center justify-center">
                <span className="text-[10px] text-emerald-300/90 font-mono bg-black/60 px-2 py-1 rounded">
                  Arahkan Barcode Ke Sini
                </span>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
              }
              className="px-3 py-1.5 rounded-lg border border-cyan-700/60 bg-cyan-900/30 text-white/90 hover:bg-cyan-800/40 flex items-center gap-1.5"
            >
              <Camera className="h-3.5 w-3.5 text-cyan-300" />
              Kamera: {facingMode === "environment" ? "Belakang" : "Depan"}
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg border border-cyan-700/60 bg-cyan-900/30 text-white/90 hover:bg-cyan-800/40 flex items-center gap-1.5"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> Suara: ON
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-rose-400" /> Suara: OFF
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-600/40 text-[11px] text-rose-200">
              {error}
            </div>
          )}

          {/* Last Scanned Result Box */}
          {lastScanned && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-1 text-xs text-white">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Berhasil Memindai</span>
                {lastScanned.isGS1 && (
                  <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                    GS1 Medis
                  </span>
                )}
              </div>
              <div className="font-mono text-white/90 truncate">
                Barcode: <strong className="text-white">{lastScanned.gtin}</strong>
              </div>
              {lastScanned.expiryDate && (
                <div className="text-[11px] text-emerald-200">
                  Expired Date (ED): <strong>{lastScanned.expiryDate}</strong>
                </div>
              )}
              {lastScanned.lotNumber && (
                <div className="text-[11px] text-emerald-200">
                  Nomor Lot/Batch: <strong>{lastScanned.lotNumber}</strong>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-medium text-xs bg-slate-800/80 border border-white/20 text-white/90 hover:bg-slate-700/80 transition-colors"
          >
            Selesai Pemindaian
          </button>
        </div>
      </div>
    </div>
  );
}

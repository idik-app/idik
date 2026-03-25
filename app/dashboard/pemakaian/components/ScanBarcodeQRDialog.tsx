"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats as F,
} from "html5-qrcode";

const REGION_ID = "pemakaian-barang-scan-region";

const SCAN_FORMATS = [
  F.QR_CODE,
  F.CODE_128,
  F.EAN_13,
  F.EAN_8,
  F.CODE_39,
  F.CODE_93,
  F.CODABAR,
  F.ITF,
  F.DATA_MATRIX,
  F.UPC_A,
  F.UPC_E,
  F.PDF_417,
];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Dipanggil setelah kode berhasil dibaca; dialog menutup sendiri lewat parent. */
  onDecoded: (text: string) => void;
};

export default function ScanBarcodeQRDialog({
  open,
  onClose,
  onDecoded,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const doneRef = useRef(false);
  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;

  useEffect(() => {
    if (!open) return;

    doneRef.current = false;
    setError(null);

    const scanner = new Html5Qrcode(REGION_ID, {
      verbose: false,
      formatsToSupport: SCAN_FORMATS,
    });
    scannerRef.current = scanner;

    const finish = (text: string) => {
      if (doneRef.current) return;
      doneRef.current = true;
      void scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          try {
            scanner.clear();
          } catch {
            /* ignore */
          }
          scannerRef.current = null;
          onDecodedRef.current(text);
        });
    };

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 200 } },
        (decodedText) => {
          finish(decodedText);
        },
        () => {}
      )
      .catch((e: unknown) => {
        const msg =
          e instanceof Error
            ? e.message
            : "Tidak dapat membuka kamera. Izinkan akses kamera atau gunakan ketik manual.";
        setError(msg);
      });

    return () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s || doneRef.current) return;
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
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-barcode-qr-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0a1628] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between gap-2">
          <h4
            id="scan-barcode-qr-title"
            className="text-[11px] font-semibold text-[#E8C547]"
          >
            Pindai barcode / QR
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/55 hover:bg-white/10 hover:text-white"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3 space-y-2">
          <p className="text-[9px] text-white/50">
            Arahkan kamera ke barcode atau kode QR. Hasil akan mengisi pencarian
            &quot;Cari &amp; tambah barang&quot;; jika hanya satu baris cocok,
            barang langsung ditambahkan.
          </p>
          <div
            id={REGION_ID}
            className="w-full min-h-[200px] rounded-lg bg-black/50 overflow-hidden [&_video]:rounded-lg"
          />
          {error ? (
            <p className="text-[10px] text-rose-300/95">{error}</p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg text-[10px] border border-white/20 text-white/85 hover:bg-white/5"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

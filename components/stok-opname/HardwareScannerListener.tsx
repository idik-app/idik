"use client";

import { useEffect, useRef } from "react";
import { parseGS1Barcode, ParsedGS1Data } from "@/lib/utils/gs1Parser";

type Props = {
  enabled: boolean;
  onScan: (parsed: ParsedGS1Data) => void;
};

/**
 * Listener global keyboard event untuk menangkap ketikan super cepat
 * dari Barcode Gun Scanner (USB / Bluetooth HID) tanpa kursor terfokus.
 */
export default function HardwareScannerListener({ enabled, onScan }: Props) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika fokus sedang berada di input text manual atau textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Barcode scanner mengetik karakter secara konstan dengan jeda < 45ms per tombol
      if (timeDiff > 100) {
        bufferRef.current = ""; // Reset buffer jika ketikan terlalu lambat (dianggap manusia)
      }

      if (e.key === "Enter") {
        if (bufferRef.current.length >= 3) {
          const raw = bufferRef.current;
          bufferRef.current = "";
          const parsed = parseGS1Barcode(raw);
          onScanRef.current(parsed);
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled]);

  return null; // Komponen transparan tanpa render DOM
}

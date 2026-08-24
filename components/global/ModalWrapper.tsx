"use client";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";

/**
 * ✅ ModalWrapper v2 — kompatibel dengan nested modal
 * - Lock scroll body
 * - Menjamin nested modal tampil di atas
 */
interface ModalWrapperProps {
  children: ReactNode;
  onClose?: () => void;
  title?: string;
  className?: string;
  zIndex?: number; // tambahan: bisa dikontrol manual
  /** Jika true, modal tidak dibatasi max-w kecil (default false) */
  isWide?: boolean;
  /** Jika true, klik pada backdrop tidak akan menutup modal (default false) */
  disableOutsideClick?: boolean;
  /** Backdrop solid tanpa blur (nested / tabel padat) */
  solidBackdrop?: boolean;
}

export function ModalWrapperContent({
  children,
  onClose,
  title,
  className,
  zIndex = 300,
  isWide = false,
  disableOutsideClick = false,
  solidBackdrop = false,
}: ModalWrapperProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  /** Parent sering mengirim fungsi baru tiap render; jangan jadikan dependency effect portal */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const backdropClick = useCallback(() => {
    if (disableOutsideClick) return;
    onCloseRef.current?.();
  }, [disableOutsideClick]);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = `modal-root-${Date.now()}`;
    document.body.appendChild(el);
    ref.current = el;
    setMounted(true);
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (disableOutsideClick) return;
        e.stopPropagation();
        onCloseRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (ref.current && ref.current.parentNode) {
        document.body.removeChild(ref.current);
      }
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [disableOutsideClick]);

  if (!mounted || !ref.current) return null;

  return createPortal(
    <div
      onClick={backdropClick}
      style={{ zIndex }}
      className={cn(
        "fixed inset-0 overflow-y-auto overflow-x-hidden",
        solidBackdrop
          ? "bg-black/75"
          : "bg-black/45 backdrop-blur-[2px] sm:bg-black/60 sm:backdrop-blur-sm",
        UI_LAYERS.dialogOverlayTop, // Pastikan ModalWrapper juga punya z-index tinggi tapi di bawah AppDialog
      )}
    >
      <div className="flex min-h-full items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative my-auto w-full overflow-y-auto overscroll-y-contain rounded-xl border p-2.5 shadow-xl transition-all sm:rounded-2xl sm:p-6",
            !isWide &&
              "max-w-[min(30rem,86vw)] sm:max-w-[min(32rem,calc(100vw-1.5rem))]",
            isWide && "max-w-[min(95vw,90rem)]",
            "border-cyan-700/40 bg-gray-900/90 text-[hsl(var(--foreground))]",
            className,
          )}
        >
          {title ? (
            <div className="mb-2 text-sm font-semibold tracking-wide text-cyan-200 sm:mb-4 sm:text-base">
              {title}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>,
    ref.current,
  );
}

/**
 * Default export agar kompatibel dengan import lama.
 * Bisa diberi zIndex khusus saat dipanggil.
 */
export default function ModalWrapper(props: ModalWrapperProps) {
  return <ModalWrapperContent {...props} />;
}

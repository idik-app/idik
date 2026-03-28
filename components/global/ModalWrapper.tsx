"use client";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, ReactNode, useCallback } from "react";

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
}

export function ModalWrapperContent({
  children,
  onClose,
  title,
  className,
  zIndex = 300,
}: ModalWrapperProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  /** Parent sering mengirim fungsi baru tiap render; jangan jadikan dependency effect portal */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const backdropClick = useCallback(() => {
    onCloseRef.current?.();
  }, []);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = `modal-root-${Date.now()}`;
    document.body.appendChild(el);
    ref.current = el;
    setMounted(true);
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.removeChild(el);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!mounted || !ref.current) return null;

  return createPortal(
    <div
      onClick={backdropClick}
      style={{ zIndex }}
      className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-black/45 backdrop-blur-[2px] sm:bg-black/60 sm:backdrop-blur-sm"
    >
      <div className="flex min-h-full items-center justify-center px-5 py-6 sm:px-4 sm:py-6 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]">
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative my-auto w-full max-h-[80dvh] max-w-[min(30rem,86vw)] overflow-y-auto overscroll-y-contain rounded-xl border border-cyan-700/40 bg-gray-900/90 p-2.5 shadow-[0_0_18px_rgba(0,255,255,0.18)] sm:max-h-none sm:max-w-[min(32rem,calc(100vw-1.5rem))] sm:overflow-visible sm:rounded-2xl sm:p-6 sm:shadow-[0_0_25px_rgba(0,255,255,0.25)] ${
            className || ""
          }`}
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
    ref.current
  );
}

/**
 * Default export agar kompatibel dengan import lama.
 * Bisa diberi zIndex khusus saat dipanggil.
 */
export default function ModalWrapper(props: ModalWrapperProps) {
  return <ModalWrapperContent {...props} />;
}

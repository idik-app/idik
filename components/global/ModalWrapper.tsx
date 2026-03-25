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
      className={`fixed inset-0 grid place-items-center bg-black/60 backdrop-blur-sm`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-gray-900/90 border border-cyan-700/40 rounded-2xl shadow-[0_0_25px_rgba(0,255,255,0.25)] p-6 ${
          className || ""
        }`}
      >
        {title ? (
          <div className="mb-4 text-cyan-200 font-semibold tracking-wide">
            {title}
          </div>
        ) : null}
        {children}
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

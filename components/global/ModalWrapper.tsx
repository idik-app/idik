"use client";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, ReactNode } from "react";

/**
 * ✅ ModalWrapper – versi aman untuk React 19 + Framer Motion
 *   Tidak menimbulkan "Cannot redefine property: $$typeof"
 *   Menggunakan portal terisolasi (div#modal-root-<id>)
 */
interface ModalWrapperProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export default function ModalWrapper({
  children,
  onClose,
  className,
}: ModalWrapperProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = `modal-root-${Date.now()}`;
    document.body.appendChild(el);
    ref.current = el;
    setMounted(true);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  if (!mounted || !ref.current) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[300] grid place-items-center bg-black/60 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-[310] bg-gray-900/90 border border-cyan-700/40 rounded-2xl shadow-[0_0_25px_rgba(0,255,255,0.25)] p-6 ${
          className || ""
        }`}
      >
        {children}
      </div>
    </div>,
    ref.current
  );
}

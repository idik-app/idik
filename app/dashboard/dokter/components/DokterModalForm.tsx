"use client";

import { createPortal } from "react-dom";
import { ReactNode, useEffect, useState } from "react";

/* =========================================================
   🌌 ModalWrapper – IDIK-App Cathlab JARVIS Mode v3.9
   Menampilkan modal di atas semua layout (z-index aman)
========================================================= */

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative z-[130] ...`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

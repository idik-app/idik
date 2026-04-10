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
      className={cn("fixed inset-0", UI_LAYERS.modalForm, "flex items-center justify-center bg-black/60")}
      onClick={onClose}
    >
      <div
        className={cn("relative", UI_LAYERS.modalFormContent, "...")}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

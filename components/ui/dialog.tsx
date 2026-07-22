"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";

/**
 * Komponen Dialog bergaya JARVIS Gold–Cyan Hybrid.
 * Semua subkomponen mendukung className agar kompatibel dengan TypeScript strict mode.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({
  children,
  className,
  bodyClassName,
  overlayClassName,
  hideOverlay,
  ...props
}: DialogPrimitive.DialogContentProps & {
  className?: string;
  /** Class untuk wrapper isi (default `p-6`); set `p-0` bila isi menata padding sendiri. */
  bodyClassName?: string;
  /** Naikkan z-index bila dialog dibuka dari layer tinggi (mis. drawer z-[5000]). */
  overlayClassName?: string;
  /** Sembunyikan backdrop hitam di belakang modal. */
  hideOverlay?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      {!hideOverlay && (
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 bg-black/80",
            UI_LAYERS.dialogOverlayTop,
            overlayClassName,
          )}
          style={{ zIndex: Z_INDEX_VALUES.dialogOverlayTop }}
        />
      )}

      <DialogPrimitive.Content
        {...props}
        className={cn(
          "fixed left-[50%] top-[50%] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-0 border border-cyan-800/40 bg-slate-950 p-0 shadow-2xl focus:outline-none",
          UI_LAYERS.dialogContentTop,
          className,
        )}
        style={{ zIndex: Z_INDEX_VALUES.dialogContentTop }}
        onPointerDownOutside={(e) => {
          // Hanya tutup jika klik benar-benar di luar (overlay), 
          // bukan karena bubbling dari dalam konten.
          if (e.target instanceof Element && e.target.closest('[data-radix-collection-item]')) {
             e.preventDefault();
          }
        }}
      >
        <div
          className={cn("relative h-full w-full p-6", bodyClassName)}
        >
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const DialogHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`mb-3 text-left ${className ?? ""}`}>{children}</div>;

export const DialogTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <DialogPrimitive.Title
    className={`text-lg font-semibold text-gold ${className ?? ""}`}
  >
    {children}
  </DialogPrimitive.Title>
);

export const DialogDescription = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <DialogPrimitive.Description
    className={`text-sm text-[hsl(var(--foreground))] opacity-80 ${className ?? ""}`}
  >
    {children}
  </DialogPrimitive.Description>
);

export const DialogFooter = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`mt-4 flex justify-end gap-2 ${className ?? ""}`}>
    {children}
  </div>
);

export const DialogClose = DialogPrimitive.Close;

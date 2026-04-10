"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";

/**
 * Komponen Dialog bergaya JARVIS Gold–Cyan Hybrid.
 * Semua subkomponen mendukung className agar kompatibel dengan TypeScript strict mode.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({
  children,
  className,
  overlayClassName,
  hideOverlay,
  ...props
}: DialogPrimitive.DialogContentProps & {
  className?: string;
  /** Naikkan z-index bila dialog dibuka dari layer tinggi (mis. drawer z-[5000]). */
  overlayClassName?: string;
  /** Sembunyikan backdrop hitam di belakang modal. */
  hideOverlay?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <AnimatePresence>
        {!hideOverlay && (
          <DialogPrimitive.Overlay key="jarvis-dialog-overlay" asChild forceMount>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`fixed inset-0 ${UI_LAYERS.overlay} bg-black/75 ${
                overlayClassName ?? ""
              }`}
            />
          </DialogPrimitive.Overlay>
        )}

        <DialogPrimitive.Content
          key="jarvis-dialog-content"
          {...props}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
            className,
          )}
        >
          {children}
        </DialogPrimitive.Content>
      </AnimatePresence>
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

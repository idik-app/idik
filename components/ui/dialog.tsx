"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Komponen Dialog bergaya JARVIS Gold–Cyan Hybrid.
 * Semua subkomponen mendukung className agar kompatibel dengan TypeScript strict mode.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({
  children,
  className,
  ...props
}: DialogPrimitive.DialogContentProps & { className?: string }) {
  return (
    <DialogPrimitive.Portal>
      <AnimatePresence>
        <DialogPrimitive.Overlay asChild forceMount>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />
        </DialogPrimitive.Overlay>

        <DialogPrimitive.Content
          {...props}
          className={`fixed z-50 top-1/2 left-1/2 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2
                     rounded-xl border border-cyan-500/40 bg-black/60 text-cyan-100 
                     shadow-xl backdrop-blur-xl focus:outline-none ${
                       className ?? ""
                     }`}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
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
    className={`text-sm text-cyan-300/80 ${className ?? ""}`}
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

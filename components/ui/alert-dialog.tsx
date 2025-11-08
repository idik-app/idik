"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Komponen AlertDialog bergaya JARVIS Gold–Cyan Hybrid.
 * Transparan, animasi halus, mendukung className di semua bagian.
 */

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export function AlertDialogContent({
  children,
  className,
  ...props
}: AlertDialogPrimitive.AlertDialogContentProps & {
  className?: string;
}) {
  return (
    <AlertDialogPrimitive.Portal>
      <AnimatePresence>
        <AlertDialogPrimitive.Overlay asChild forceMount>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
        </AlertDialogPrimitive.Overlay>
        <AlertDialogPrimitive.Content
          {...props}
          className={`fixed z-50 top-1/2 left-1/2 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2
                     rounded-xl border border-cyan-500/40 bg-black/60 text-cyan-100 
                     shadow-lg backdrop-blur-xl focus:outline-none ${
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
        </AlertDialogPrimitive.Content>
      </AnimatePresence>
    </AlertDialogPrimitive.Portal>
  );
}

export const AlertDialogHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`mb-3 text-left ${className ?? ""}`}>{children}</div>;

export const AlertDialogFooter = ({
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

export const AlertDialogTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <AlertDialogPrimitive.Title
    className={`text-lg font-semibold text-gold ${className ?? ""}`}
  >
    {children}
  </AlertDialogPrimitive.Title>
);

export const AlertDialogDescription = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <AlertDialogPrimitive.Description
    className={`text-sm text-cyan-300/80 ${className ?? ""}`}
  >
    {children}
  </AlertDialogPrimitive.Description>
);

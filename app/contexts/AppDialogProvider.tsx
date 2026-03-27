"use client";

import React, { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  XCircle,
} from "lucide-react";

import {
  AppDialogContext,
  type AppAlertVariant,
  type AppDialogContextValue,
} from "@/contexts/AppDialogContext";

type AlertPayload = {
  kind: "alert";
  title: string;
  message: string;
  variant: AppAlertVariant;
  resolve: () => void;
};

type ConfirmPayload = {
  kind: "confirm";
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: (v: boolean) => void;
};

type DialogPayload = AlertPayload | ConfirmPayload;

const defaultAlertTitle: Record<AppAlertVariant, string> = {
  info: "Informasi",
  error: "Terjadi kesalahan",
  success: "Berhasil",
  warning: "Perhatian",
};

function DialogSurface({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 6 }}
      transition={{ type: "spring", damping: 26, stiffness: 320 }}
      className="relative w-[min(100%,22rem)] rounded-2xl border border-[#E8C547]/35 bg-[#050b14]/95 px-5 py-5 shadow-[0_0_40px_rgba(0,0,0,0.55),0_0_24px_rgba(232,197,71,0.12)] backdrop-blur-xl"
    >
      {children}
    </motion.div>
  );
}

function VariantIcon({ variant }: { variant: AppAlertVariant }) {
  const cls = "h-10 w-10 shrink-0 rounded-xl border p-2";
  switch (variant) {
    case "error":
      return (
        <div className={`${cls} border-rose-500/40 bg-rose-950/50 text-rose-300`}>
          <XCircle className="h-full w-full" strokeWidth={2} aria-hidden />
        </div>
      );
    case "success":
      return (
        <div
          className={`${cls} border-emerald-500/40 bg-emerald-950/50 text-emerald-300`}
        >
          <CheckCircle2 className="h-full w-full" strokeWidth={2} aria-hidden />
        </div>
      );
    case "warning":
      return (
        <div
          className={`${cls} border-amber-500/40 bg-amber-950/50 text-amber-200`}
        >
          <AlertTriangle className="h-full w-full" strokeWidth={2} aria-hidden />
        </div>
      );
    default:
      return (
        <div className={`${cls} border-cyan-500/35 bg-[#0a1628] text-[#E8C547]`}>
          <Info className="h-full w-full" strokeWidth={2} aria-hidden />
        </div>
      );
  }
}

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<DialogPayload | null>(null);

  const alertFn = useCallback<AppDialogContextValue["alert"]>(
    ({ message, title, variant = "info" }) => {
      return new Promise<void>((resolvePromise) => {
        setOpen({
          kind: "alert",
          title: title ?? defaultAlertTitle[variant],
          message,
          variant,
          resolve: () => {
            resolvePromise();
            setOpen(null);
          },
        });
      });
    },
    [],
  );

  const confirmFn = useCallback<AppDialogContextValue["confirm"]>(
    ({
      message,
      title = "Konfirmasi",
      confirmLabel = "Ya, lanjutkan",
      cancelLabel = "Batal",
      danger = false,
    }) => {
      return new Promise<boolean>((resolvePromise) => {
        setOpen({
          kind: "confirm",
          title,
          message,
          confirmLabel,
          cancelLabel,
          danger,
          resolve: (v) => {
            resolvePromise(v);
            setOpen(null);
          },
        });
      });
    },
    [],
  );

  const value = useMemo(() => ({ alert: alertFn, confirm: confirmFn }), [
    alertFn,
    confirmFn,
  ]);

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {open ? (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="presentation"
          >
            <motion.button
              type="button"
              aria-label="Tutup latar"
              className="absolute inset-0 bg-black/75 backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (open.kind === "alert") open.resolve();
                else open.resolve(false);
              }}
            />
            <div className="relative z-10 flex max-h-[min(85vh,32rem)] w-full max-w-md items-center justify-center">
              {open.kind === "alert" ? (
                <DialogSurface>
                  <div className="flex gap-3">
                    <VariantIcon variant={open.variant} />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h2 className="text-sm font-semibold text-[#E8C547] tracking-tight">
                        {open.title}
                      </h2>
                      <p className="mt-2 text-[12px] leading-relaxed text-white/85 whitespace-pre-line">
                        {open.message}
                      </p>
                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={open.resolve}
                          className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#2dd4bf] px-5 text-[12px] font-semibold text-[#0a0f18] shadow-[0_0_16px_rgba(232,197,71,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/60"
                        >
                          Mengerti
                        </button>
                      </div>
                    </div>
                  </div>
                </DialogSurface>
              ) : (
                <DialogSurface>
                  <div className="flex gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border p-2 ${
                        open.danger
                          ? "border-rose-500/45 bg-rose-950/55 text-rose-200"
                          : "border-[#E8C547]/30 bg-[#0a1628] text-[#E8C547]"
                      }`}
                    >
                      {open.danger ? (
                        <AlertTriangle
                          className="h-6 w-6"
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : (
                        <HelpCircle
                          className="h-6 w-6"
                          strokeWidth={2}
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h2 className="text-sm font-semibold text-[#E8C547] tracking-tight">
                        {open.title}
                      </h2>
                      <p className="mt-2 text-[12px] leading-relaxed text-white/85 whitespace-pre-line">
                        {open.message}
                      </p>
                      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => open.resolve(false)}
                          className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/20 bg-black/30 px-4 text-[12px] font-medium text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/25"
                        >
                          {open.cancelLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => open.resolve(true)}
                          className={`inline-flex min-h-[40px] items-center justify-center rounded-full px-5 text-[12px] font-semibold focus:outline-none focus:ring-2 ${
                            open.danger
                              ? "border border-rose-500/50 bg-rose-950/90 text-rose-100 hover:bg-rose-900 focus:ring-rose-400/50"
                              : "bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#2dd4bf] text-[#0a0f18] shadow-[0_0_16px_rgba(232,197,71,0.35)] hover:brightness-105 focus:ring-[#E8C547]/60"
                          }`}
                        >
                          {open.confirmLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                </DialogSurface>
              )}
            </div>
          </div>
        ) : null}
      </AnimatePresence>
    </AppDialogContext.Provider>
  );
}


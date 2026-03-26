"use client";

import { createContext, useContext } from "react";

export type AppAlertVariant = "info" | "error" | "success" | "warning";

export type AppDialogContextValue = {
  /** Dialog teks satu tombol (ganti `window.alert`). */
  alert: (opts: {
    message: string;
    title?: string;
    variant?: AppAlertVariant;
  }) => Promise<void>;
  /** Konfirmasi ya/tidak (ganti `window.confirm`). */
  confirm: (opts: {
    message: string;
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
  }) => Promise<boolean>;
};

export const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function useAppDialog(): AppDialogContextValue {
  const ctx = useContext(AppDialogContext);
  if (!ctx) {
    throw new Error("useAppDialog must be used within AppDialogProvider");
  }
  return ctx;
}

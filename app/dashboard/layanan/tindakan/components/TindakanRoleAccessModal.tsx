"use client";

import Link from "next/link";
import { Building2, PackageOpen, X, RefreshCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AccessTarget = "depo" | "distributor" | "cssd";

export default function TindakanRoleAccessModal({
  open,
  target,
  onOpenChange,
}: {
  open: boolean;
  target: AccessTarget;
  onOpenChange: (open: boolean) => void;
}) {
  const isDepo = target === "depo";
  const isCssd = target === "cssd";
  const title = isDepo ? "UI Depo Farmasi" : isCssd ? "UI CSSD / Sterilisasi" : "UI Distributor";
  const Icon = isDepo ? PackageOpen : isCssd ? RefreshCcw : Building2;
  const embeddedHref = isDepo ? "/depo/dashboard" : isCssd ? "/cssd/dashboard" : "/distributor/barang";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[85vh] w-[min(100vw-1rem,40rem)] max-w-[40rem] border p-0",
          "border-slate-300/60 bg-white/98 dark:border-cyan-500/35 dark:bg-black/80",
        )}
      >
        <div className="flex flex-col gap-3 p-3 sm:p-4">
          <DialogHeader className="space-y-2 pr-8 text-left">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isDepo
                      ? "text-cyan-700 dark:text-white"
                      : "text-emerald-700 dark:text-white",
                  )}
                />
                <DialogTitle className="text-slate-900 dark:text-white">
                  {title}
                </DialogTitle>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "rounded-lg p-1.5 transition",
                  "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                  "dark:text-white/85 dark:hover:bg-white/10 dark:hover:text-white",
                )}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DialogDescription className="sr-only">
              Panel akses peran tindakan.
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "rounded-xl border p-2",
              "border-slate-300 bg-white",
              "dark:border-cyan-700/50 dark:bg-black/60",
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate text-xs font-bold text-slate-800 dark:text-white">
                Panel aktif: {embeddedHref}
              </p>
              <Link
                href={embeddedHref}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-bold transition",
                  "border-slate-300 text-slate-700 hover:bg-slate-100",
                  "dark:border-cyan-700/50 dark:text-white dark:hover:bg-cyan-950/40",
                )}
              >
                Buka penuh
              </Link>
            </div>
            <iframe
              title={`Panel ${embeddedHref}`}
              src={embeddedHref}
              className="h-[58vh] w-full rounded-lg border border-slate-200 bg-white dark:border-cyan-700/40 dark:bg-black"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

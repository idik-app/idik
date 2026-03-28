"use client";

import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";

type ThemeTone = "cyan" | "emerald";

export default function TindakanHeader({
  themeTone,
  onThemeToneChange,
}: {
  themeTone: ThemeTone;
  onThemeToneChange: (next: ThemeTone) => void;
}) {
  const now = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <div
      className={`relative overflow-hidden rounded-xl border px-3 py-3 shadow-lg sm:px-4 sm:py-3 ${
        themeTone === "emerald"
          ? "border-emerald-800/45 bg-gradient-to-br from-emerald-950/35 via-black/50 to-slate-950/50 shadow-emerald-950/20"
          : "border-cyan-800/45 bg-gradient-to-br from-cyan-950/35 via-black/50 to-slate-950/50 shadow-cyan-950/20"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          themeTone === "emerald"
            ? "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_45%)]"
            : "bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_45%)]"
        }`}
      />
      <div className="relative z-10 space-y-2 sm:space-y-3">
        <Link
          href="/dashboard/perawat"
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
            themeTone === "emerald"
              ? "border-emerald-800/55 bg-emerald-950/35 text-emerald-300/85 hover:border-emerald-600/70 hover:text-emerald-200"
              : "border-cyan-800/55 bg-cyan-950/35 text-cyan-300/85 hover:border-cyan-600/70 hover:text-cyan-200"
          }`}
        >
          <ChevronLeft size={14} />
          Beranda Perawat
        </Link>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-cyan-50 break-words">
              Tindakan Medis Cathlab
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 self-stretch sm:self-start min-w-0">
            <div
              className={`inline-flex items-center gap-1 rounded-xl border bg-black/30 p-1 ${
                themeTone === "emerald" ? "border-emerald-800/45" : "border-cyan-800/45"
              }`}
            >
              <button
                type="button"
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  themeTone === "cyan"
                    ? "bg-cyan-500/25 text-cyan-100"
                    : "text-cyan-200/70 hover:text-cyan-100"
                }`}
                onClick={() => onThemeToneChange("cyan")}
              >
                Cyan
              </button>
              <button
                type="button"
                className={`rounded-lg px-2.5 py-1 text-xs transition ${
                  themeTone === "emerald"
                    ? "bg-emerald-500/25 text-emerald-100"
                    : "text-emerald-200/70 hover:text-emerald-100"
                }`}
                onClick={() => onThemeToneChange("emerald")}
              >
                Emerald
              </button>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg border bg-black/35 px-2.5 py-1.5 ${
                themeTone === "emerald" ? "border-emerald-800/45" : "border-cyan-800/45"
              }`}
            >
              <Sparkles
                className={`h-4 w-4 ${
                  themeTone === "emerald" ? "text-emerald-300" : "text-cyan-300"
                }`}
              />
              <span
                className={`text-[10px] sm:text-xs min-w-0 max-w-full sm:max-w-[20rem] md:max-w-none truncate ${
                  themeTone === "emerald" ? "text-emerald-100/85" : "text-cyan-100/85"
                }`}
                title={now}
              >
                {now}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

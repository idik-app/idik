"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export type PerawatOption = {
  id: string;
  nama_perawat: string;
  bidang: string | null;
  aktif?: boolean;
};

export function formatPerawatLabel(p: PerawatOption): string {
  const nama = (p.nama_perawat ?? "").trim();
  const b = (p.bidang ?? "").trim();
  if (nama && b) return `${nama} — ${b}`;
  return nama || b || "";
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

const inputToneDark = {
  drawer:
    "w-full bg-black/40 border border-cyan-900/50 rounded-md px-2 py-1.5 pr-8 text-sm font-semibold text-cyan-100 placeholder:text-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/35",
  default:
    "w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 pr-8 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40",
} as const;

const inputToneDrawerLight =
  "w-full rounded-md border border-cyan-400/55 bg-white px-2 py-1.5 pr-8 text-sm font-semibold text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/35";

export function PerawatCombobox({
  value,
  onChange,
  onSelectOption,
  onBlurCommit,
  options,
  loading,
  disabled,
  className,
  listboxId = "perawat-listbox",
  tone = "drawer",
}: {
  value: string;
  onChange: (label: string) => void;
  onSelectOption?: (opt: PerawatOption) => void;
  /** Simpan otomatis saat fokus keluar (relatedTarget di luar komponen). */
  onBlurCommit?: (currentValue: string) => void;
  options: PerawatOption[];
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  listboxId?: string;
  tone?: keyof typeof inputToneDark;
}) {
  const { theme } = useTheme();
  const drawerLight = tone === "drawer" && theme === "light";
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = normalize(value);
    if (!q) return options;
    return options.filter((p) => {
      const hay = normalize(`${p.nama_perawat} ${p.bidang ?? ""}`);
      return hay.includes(q);
    });
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const listSurface = cn(
    "py-1 shadow-xl",
    tone === "drawer"
      ? drawerLight
        ? "border border-cyan-400/55 bg-white"
        : "border border-cyan-900/50 bg-[#070d14]"
      : "border border-white/15 bg-[#0a1628]",
  );

  const spinColor =
    tone === "drawer"
      ? drawerLight
        ? "text-cyan-600"
        : "text-cyan-400/80"
      : "text-[#E8C547]/80";

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          value={value}
          disabled={disabled || loading}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            if (!onBlurCommit) return;
            const next = e.relatedTarget as Node | null;
            if (next && wrapRef.current?.contains(next)) return;
            onBlurCommit(value);
          }}
          autoComplete="off"
          placeholder={
            loading ? "Memuat master perawat…" : "Cari / pilih perawat…"
          }
          className={
            drawerLight
              ? inputToneDrawerLight
              : inputToneDark[tone]
          }
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
        />
        {loading ? (
          <Loader2
            className={cn(
              "pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin",
              spinColor,
            )}
            aria-hidden
          />
        ) : null}
      </div>
      {open && !loading && filtered.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-full z-[60] mt-1 max-h-48 overflow-auto rounded-lg",
            listSurface,
          )}
        >
          {filtered.map((p) => {
            const label = formatPerawatLabel(p);
            return (
              <li key={p.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  className={cn(
                    "w-full px-2 py-1.5 text-left text-[11px] focus:outline-none sm:text-sm",
                    tone === "drawer"
                      ? drawerLight
                        ? "text-slate-900 hover:bg-cyan-100/80 focus:bg-cyan-100"
                        : "text-cyan-100 hover:bg-cyan-500/15 focus:bg-cyan-500/20"
                      : "text-white hover:bg-[#E8C547]/20 focus:bg-[#E8C547]/25",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(label);
                    onSelectOption?.(p);
                    setOpen(false);
                  }}
                >
                  <span
                    className={cn(
                      "block font-semibold",
                      tone === "drawer"
                        ? drawerLight
                          ? "text-slate-950"
                          : "text-cyan-50/95"
                        : "text-white/95",
                    )}
                  >
                    {p.nama_perawat}
                    {p.aktif === false ? (
                      <span
                        className={cn(
                          "ml-1 font-normal",
                          drawerLight
                            ? "text-amber-800/90"
                            : "text-amber-200/80",
                        )}
                      >
                        (nonaktif)
                      </span>
                    ) : null}
                  </span>
                  {p.bidang ? (
                    <span
                      className={cn(
                        "block text-[10px]",
                        tone === "drawer"
                          ? drawerLight
                            ? "text-slate-600"
                            : "text-white/50"
                          : "text-white/50",
                      )}
                    >
                      {p.bidang}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {open && !loading && options.length === 0 ? (
        <p
          className={cn(
            "absolute left-0 right-0 top-full z-[60] mt-1 rounded-lg px-2 py-2 text-[10px]",
            tone === "drawer"
              ? drawerLight
                ? "border border-cyan-400/55 bg-white text-slate-600"
                : "border border-cyan-900/50 bg-[#070d14] text-cyan-200/60"
              : "border border-white/15 bg-[#0a1628] text-white/55",
          )}
        >
          Belum ada pilihan di master. Gunakan form Tambah ke master perawat di
          bawah, atau ketik nama lalu klik di luar field untuk menyimpan ke kasus.
        </p>
      ) : null}
    </div>
  );
}

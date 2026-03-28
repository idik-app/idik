"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type MasterTindakanOption = {
  id: string;
  nama: string;
  aktif?: boolean;
  urutan?: number;
};

export function formatMasterTindakanLabel(
  o: Pick<MasterTindakanOption, "nama">,
): string {
  return String(o.nama ?? "").trim();
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Satu saran unik: exact → prefix → substring (case-insensitive). */
export function resolveMasterTindakanAutofill(
  query: string,
  options: MasterTindakanOption[],
): MasterTindakanOption | null {
  const q = normalize(query);
  if (!q || q === "belum diisi") return null;

  const exact = options.find((o) => normalize(o.nama) === q);
  if (exact) return exact;

  const prefix = options.filter((o) => normalize(o.nama).startsWith(q));
  if (prefix.length === 1) return prefix[0] ?? null;

  const sub = options.filter((o) => normalize(o.nama).includes(q));
  if (sub.length === 1) return sub[0] ?? null;

  return null;
}

export function MasterTindakanCombobox({
  value,
  onChange,
  onSelectOption,
  onInputBlur,
  options,
  loading,
  className,
  listboxId = "master-tindakan-listbox",
}: {
  value: string;
  onChange: (label: string) => void;
  onSelectOption?: (opt: MasterTindakanOption) => void;
  /** Nilai setelah autofill (jika ada); gunakan ini untuk commit ke server. */
  onInputBlur?: (finalValue: string) => void;
  options: MasterTindakanOption[];
  loading?: boolean;
  className?: string;
  listboxId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurRef = useRef(false);

  const filtered = useMemo(() => {
    const q = normalize(value);
    if (!q) return options;
    return options.filter((r) => {
      const hay = normalize(r.nama ?? "");
      return hay.includes(q);
    });
  }, [options, value]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered]);

  const pickOption = useCallback(
    (opt: MasterTindakanOption) => {
      const label = formatMasterTindakanLabel(opt);
      onChange(label);
      onSelectOption?.(opt);
      setOpen(false);
      skipBlurRef.current = false;
    },
    [onChange, onSelectOption],
  );

  const commitBlur = useCallback(() => {
    const trimmed = value.trim();
    const resolved =
      resolveMasterTindakanAutofill(trimmed, options) ??
      resolveMasterTindakanAutofill(trimmed, filtered);
    const finalLabel = resolved
      ? formatMasterTindakanLabel(resolved)
      : trimmed;
    if (finalLabel !== value) {
      onChange(finalLabel);
      if (resolved) onSelectOption?.(resolved);
    }
    onInputBlur?.(finalLabel.trim());
  }, [value, options, filtered, onChange, onSelectOption, onInputBlur]);

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

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (loading) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (filtered.length === 0) return;
      setHighlightIndex((i) => (i + 1) % filtered.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (filtered.length === 0) return;
      setHighlightIndex((i) => (i - 1 + filtered.length) % filtered.length);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered.length > 0) {
        const idx = Math.min(highlightIndex, filtered.length - 1);
        pickOption(filtered[idx]!);
        return;
      }
      const one =
        filtered.length === 1
          ? filtered[0]
          : resolveMasterTindakanAutofill(value.trim(), filtered);
      if (one) {
        pickOption(one);
        return;
      }
      setOpen(false);
      commitBlur();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }

    if (e.key === "Tab" && open && filtered.length === 1) {
      e.preventDefault();
      pickOption(filtered[0]!);
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            if (skipBlurRef.current) {
              skipBlurRef.current = false;
              return;
            }
            commitBlur();
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          autoComplete="off"
          spellCheck={false}
          placeholder={
            loading ? "Memuat daftar tindakan…" : "Ketik untuk autofill…"
          }
          className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 pr-8 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && filtered.length > 0
              ? `${listboxId}-opt-${highlightIndex}`
              : undefined
          }
        />
        {loading ? (
          <Loader2
            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#E8C547]/80"
            aria-hidden
          />
        ) : null}
      </div>
      {open && !loading && filtered.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          onMouseDown={() => {
            skipBlurRef.current = true;
          }}
          className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-48 overflow-auto rounded-lg border border-white/15 bg-[#0a1628] py-1 shadow-xl"
        >
          {filtered.map((r, i) => {
            const label = formatMasterTindakanLabel(r);
            const active = i === highlightIndex;
            return (
              <li key={r.id} role="presentation">
                <button
                  type="button"
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "w-full px-2 py-1.5 text-left text-[11px] text-white focus:outline-none",
                    active
                      ? "bg-[#E8C547]/25 ring-1 ring-inset ring-[#E8C547]/35"
                      : "hover:bg-[#E8C547]/20",
                  )}
                  onMouseEnter={() => setHighlightIndex(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickOption(r)}
                >
                  <span className="block font-medium text-white/95">
                    {label || r.nama}
                    {r.aktif === false ? (
                      <span className="ml-1 font-normal text-amber-200/80">
                        (nonaktif)
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {open && !loading && options.length === 0 ? (
        <p className="absolute left-0 right-0 top-full z-[60] mt-1 rounded-lg border border-white/15 bg-[#0a1628] px-2 py-2 text-[10px] text-white/55">
          Belum ada jenis tindakan di master. Kelola lewat menu{" "}
          <span className="text-[#E8C547]/90">Master jenis tindakan</span>.
        </p>
      ) : null}
    </div>
  );
}

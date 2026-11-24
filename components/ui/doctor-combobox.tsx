"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";

export type DoctorOption = {
  id: string;
  nama_dokter: string;
  spesialis: string | null;
  /** Dari API: false jika status nonaktif di master (tetap bisa dipilih). */
  aktif?: boolean;
};

export function formatDoctorLabel(d: DoctorOption): string {
  const nama = (d.nama_dokter ?? "").trim();
  const sp = (d.spesialis ?? "").trim();
  if (nama && sp) return `${nama}, ${sp}`;
  return nama || sp || "";
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveDoctorExactMatch(
  options: DoctorOption[],
  label: string,
): DoctorOption | null {
  const t = label.trim();
  if (!t) return null;
  for (const d of options) {
    if (formatDoctorLabel(d) === t) return d;
  }
  for (const d of options) {
    const n = String(d.nama_dokter ?? "").trim();
    if (n === t) return d;
  }
  const tl = t.toLowerCase();
  for (const d of options) {
    const n = String(d.nama_dokter ?? "")
      .trim()
      .toLowerCase();
    if (n === tl) return d;
  }
  return null;
}

/** Token dari input: alfanumerik, tanpa prefiks dr. */
function doctorQueryTokens(label: string): string[] {
  const stripped = label
    .trim()
    .replace(/^dr\.?\s*/i, "")
    .trim();
  const parts = stripped.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return parts.filter((p) => p.length >= 2);
}

function tokenMatchesDoctorHaystack(haystack: string, token: string): boolean {
  if (token.length < 2) return false;
  return new RegExp(`\\b${escapeRegex(token)}`, "i").test(haystack);
}

/** Kunci alias: tanpa prefiks dr., lowercase, spasi tunggal. */
function normalizeDoctorAliasKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^dr\.?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Panggilan / teks lama di kolom `tindakan.dokter` → baris master (via pola nama).
 * Hanya dipakai jika cocok ke 0 atau 1 kandidat kuat; jika ambigu, abaikan.
 */
const LEGACY_DOCTOR_ALIAS_RESOLVERS: Array<{
  aliasKeys: string[];
  matchesNormalizedNama: (namaNorm: string) => boolean;
}> = [
  {
    aliasKeys: ["yuyung"],
    matchesNormalizedNama: (namaNorm) =>
      namaNorm.includes("nurpatria") && namaNorm.includes("rachman"),
  },
];

function resolveDoctorByLegacyAlias(
  options: DoctorOption[],
  input: string,
): DoctorOption | null {
  const key = normalizeDoctorAliasKey(input);
  if (!key) return null;
  for (const rule of LEGACY_DOCTOR_ALIAS_RESOLVERS) {
    if (!rule.aliasKeys.includes(key)) continue;
    const hits = options.filter((d) => {
      const hay = normalize(
        `${String(d.nama_dokter ?? "")} ${String(d.spesialis ?? "")}`,
      );
      return rule.matchesNormalizedNama(hay);
    });
    if (hits.length === 1) return hits[0]!;
    if (hits.length > 1) {
      return [...hits].sort(
        (a, b) => b.nama_dokter.length - a.nama_dokter.length,
      )[0]!;
    }
  }
  return null;
}

/**
 * Samakan panggilan / nama pendek dengan satu baris master dokter (hanya jika hasilnya tunggal).
 */
export function resolveDoctorFromLooseInput(
  options: DoctorOption[],
  input: string,
): DoctorOption | null {
  if (!options.length) return null;
  const raw = input.trim();
  if (
    !raw ||
    raw === "—" ||
    raw.toLowerCase().includes("belum diisi") ||
    raw.toLowerCase().includes("belum ditentukan")
  ) {
    return null;
  }

  // 1. Exact match (display label or nama_dokter)
  const exact = resolveDoctorExactMatch(options, raw);
  if (exact) return exact;

  // 2. Legacy alias match
  const aliasHit = resolveDoctorByLegacyAlias(options, raw);
  if (aliasHit) return aliasHit;

  const cleanInput = raw
    .replace(/^(dr|drg|sp\.?[a-z]*)\.?\s*/gi, "")
    .trim()
    .toLowerCase();

  // 3. Word prefix: any word in name/specialist starts with cleanInput (e.g. "faish" -> "dr. M. Faishal", "andrian" -> "dr. Andrianus")
  if (cleanInput.length >= 2) {
    const wordPrefixHits = options.filter((d) => {
      const hay = `${String(d.nama_dokter ?? "")} ${String(d.spesialis ?? "")}`.toLowerCase();
      return new RegExp(`\\b${escapeRegex(cleanInput)}`, "i").test(hay);
    });
    if (wordPrefixHits.length === 1) return wordPrefixHits[0]!;
    if (wordPrefixHits.length > 1) {
      const nameHits = wordPrefixHits.filter((d) =>
        new RegExp(`\\b${escapeRegex(cleanInput)}`, "i").test(
          String(d.nama_dokter ?? "").toLowerCase(),
        ),
      );
      if (nameHits.length === 1) return nameHits[0]!;
    }
  }

  // 4. Token-based matching (each token matches word prefix)
  const tokens = doctorQueryTokens(raw);
  if (tokens.length > 0) {
    const candidates = options.filter((d) => {
      const hay = `${String(d.nama_dokter ?? "")} ${String(d.spesialis ?? "")}`.toLowerCase();
      return tokens.every((tok) =>
        new RegExp(`\\b${escapeRegex(tok)}`, "i").test(hay),
      );
    });
    if (candidates.length === 1) return candidates[0]!;
  }

  // 5. General substring match
  if (cleanInput.length >= 2) {
    const subHits = options.filter((d) => {
      const hay = `${String(d.nama_dokter ?? "")} ${String(d.spesialis ?? "")}`.toLowerCase();
      return hay.includes(cleanInput);
    });
    if (subHits.length === 1) return subHits[0]!;
  }

  return null;
}

/** Label tampilan (nama + spesialis) dari nilai tersimpan / input kasar. */
export function canonicalDoctorDisplayValue(
  options: DoctorOption[],
  stored: string,
): string {
  const raw = String(stored ?? "").trim();
  if (!raw || !options.length) return raw;
  const r = resolveDoctorFromLooseInput(options, raw);
  return r ? formatDoctorLabel(r) : raw;
}

/** Nilai untuk kolom `dokter` di DB (mengikuti `nama_dokter` master). */
export function canonicalDoctorStoredValue(
  options: DoctorOption[],
  input: string,
): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  if (!options.length) return raw;
  const r = resolveDoctorFromLooseInput(options, raw);
  return r ? String(r.nama_dokter).trim() : raw;
}

export const DOCTOR_COLOR_PALETTE = [
  // 0. Teal / Cyan
  {
    inputLight: "!text-teal-700 dark:!text-cyan-300 font-bold",
    tableLight: "!text-teal-900 dark:!text-teal-900 font-bold",
  },
  // 1. Emerald / Green
  {
    inputLight: "!text-emerald-700 dark:!text-emerald-300 font-bold",
    tableLight: "!text-emerald-900 dark:!text-emerald-900 font-bold",
  },
  // 2. Amber / Orange
  {
    inputLight: "!text-amber-800 dark:!text-amber-300 font-bold",
    tableLight: "!text-amber-900 dark:!text-amber-900 font-bold",
  },
  // 3. Violet / Purple
  {
    inputLight: "!text-purple-700 dark:!text-purple-300 font-bold",
    tableLight: "!text-purple-900 dark:!text-purple-900 font-bold",
  },
  // 4. Sky / Blue
  {
    inputLight: "!text-sky-700 dark:!text-sky-300 font-bold",
    tableLight: "!text-blue-900 dark:!text-blue-900 font-bold",
  },
  // 5. Rose / Pink
  {
    inputLight: "!text-rose-700 dark:!text-rose-300 font-bold",
    tableLight: "!text-rose-900 dark:!text-rose-900 font-bold",
  },
  // 6. Indigo
  {
    inputLight: "!text-indigo-700 dark:!text-indigo-300 font-bold",
    tableLight: "!text-indigo-900 dark:!text-indigo-900 font-bold",
  },
  // 7. Cyan / Blue-green
  {
    inputLight: "!text-cyan-700 dark:!text-cyan-300 font-bold",
    tableLight: "!text-cyan-900 dark:!text-cyan-900 font-bold",
  },
  // 8. Fuchsia
  {
    inputLight: "!text-fuchsia-700 dark:!text-fuchsia-300 font-bold",
    tableLight: "!text-fuchsia-900 dark:!text-fuchsia-900 font-bold",
  },
  // 9. Lime / Green-yellow
  {
    inputLight: "!text-lime-800 dark:!text-lime-300 font-bold",
    tableLight: "!text-lime-950 dark:!text-lime-950 font-bold",
  },
];

export function getDoctorColorClass(
  name?: string | null,
  mode: "auto" | "light" = "auto",
): string {
  const s = String(name ?? "").trim();
  if (
    !s ||
    s === "—" ||
    s.toLowerCase().includes("belum diisi") ||
    s.toLowerCase().includes("belum ditentukan")
  ) {
    return mode === "light"
      ? "!text-slate-400 dark:!text-slate-400 placeholder:!text-slate-400 font-normal"
      : "text-slate-500 placeholder:text-slate-400 dark:text-slate-400 dark:placeholder:text-slate-500";
  }
  const clean =
    s
      .toLowerCase()
      .replace(/^(dr|drg|sp\.?[a-z]*)\.?\s*/gi, "")
      .trim() || s.toLowerCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % DOCTOR_COLOR_PALETTE.length;
  const item = DOCTOR_COLOR_PALETTE[idx];
  return mode === "light" ? item.tableLight : item.inputLight;
}

export function DoctorCombobox({
  value,
  onChange,
  onSelectOption,
  onInputBlur,
  options,
  loading,
  className,
  inputClassName,
  disabled,
  placeholder,
  variant = "default",
  /** Unik per instance jika beberapa combobox di satu halaman (a11y). */
  listboxId = "pemakaian-doctor-listbox",
}: {
  value: string;
  onChange: (label: string) => void;
  /** Dipanggil hanya saat user memilih dari list (klik). */
  onSelectOption?: (opt: DoctorOption) => void;
  /** Dipanggil saat input kehilangan fokus (nilai ketikan manual). */
  onInputBlur?: (finalText: string) => void;
  options: DoctorOption[];
  loading?: boolean;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  placeholder?: string;
  variant?: "default" | "table";
  listboxId?: string;
}) {
  const isLight = variant === "table";
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  /** Hindari commit blur saat klik item list. */
  const skipBlurRef = useRef(false);

  const updateDropdownPos = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const dropdownHeight = 220;
    const spaceBelow = viewportHeight - rect.bottom;
    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const top = openUp ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4;
    const width = Math.max(rect.width, 240);
    const left = Math.min(Math.max(8, rect.left), viewportWidth - width - 16);

    setDropdownPos({ top, left, width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateDropdownPos();
    const handleScrollOrResize = () => {
      updateDropdownPos();
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, updateDropdownPos]);

  const filtered = useMemo(() => {
    const q = normalize(value);
    if (!q) return options;
    return options.filter((d) => {
      const hay = normalize(`${d.nama_dokter} ${d.spesialis ?? ""}`);
      if (hay.includes(q)) return true;
      const aliasHit = resolveDoctorByLegacyAlias(options, value);
      if (aliasHit && aliasHit.id === d.id) return true;
      const tokens = doctorQueryTokens(value);
      if (tokens.length > 0) {
        return tokens.every((tok) => tokenMatchesDoctorHaystack(hay, tok));
      }
      return false;
    });
  }, [options, value]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered]);

  const pickOption = (opt: DoctorOption) => {
    const label = formatDoctorLabel(opt);
    onChange(label);
    onSelectOption?.(opt);
    setOpen(false);
    skipBlurRef.current = false;
  };

  const handleBlur = () => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    const resolved = resolveDoctorFromLooseInput(options, value);
    if (resolved) {
      const label = formatDoctorLabel(resolved);
      if (label !== value) {
        onChange(label);
        onSelectOption?.(resolved);
      }
      onInputBlur?.(label);
    } else {
      onInputBlur?.(value.trim());
    }
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (filtered.length > 0) {
        setHighlightIndex((i) => (i + 1) % filtered.length);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (filtered.length > 0) {
        setHighlightIndex((i) => (i - 1 + filtered.length) % filtered.length);
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered.length > 0) {
        const idx = Math.min(highlightIndex, filtered.length - 1);
        pickOption(filtered[idx]!);
        return;
      }
      const resolved = resolveDoctorFromLooseInput(options, value);
      if (resolved) {
        pickOption(resolved);
        return;
      }
      setOpen(false);
      onInputBlur?.(value.trim());
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }

    if (e.key === "Tab") {
      if (open && filtered.length > 0) {
        const idx = Math.min(highlightIndex, filtered.length - 1);
        pickOption(filtered[idx]!);
      } else {
        const resolved = resolveDoctorFromLooseInput(options, value);
        if (resolved) {
          pickOption(resolved);
        }
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapRef.current &&
        !wrapRef.current.contains(target) &&
        !document.getElementById(listboxId)?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, listboxId]);

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          value={value}
          readOnly={disabled}
          onChange={(e) => {
            if (!disabled) {
              onChange(e.target.value);
              setOpen(true);
            }
          }}
          onBlur={handleBlur}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onKeyDown={onInputKeyDown}
          autoComplete="off"
          placeholder={
            placeholder !== undefined
              ? placeholder
              : loading
              ? "Memuat daftar dokter…"
              : ""
          }
          className={cn(
            isLight
              ? "w-full bg-transparent border-none px-2 py-1.5 pr-12 text-xs font-bold text-slate-900 dark:text-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-0"
              : "w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 pr-12 text-[11px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/90 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40",
            "truncate",
            inputClassName,
          )}
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
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#E8C547]/80"
            aria-hidden
          />
        ) : (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {value && !disabled && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                  setOpen(false);
                }}
                className={cn(
                  "p-0.5 transition-colors",
                  isLight
                    ? "text-slate-400 hover:text-red-600"
                    : "text-slate-400 hover:text-red-400 dark:text-white/60 dark:hover:text-red-300",
                )}
                title="Hapus pilihan dokter"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                if (!disabled) setOpen((prev) => !prev);
              }}
              className={cn(
                "p-0.5 transition-colors",
                isLight
                  ? "text-slate-500 hover:text-slate-800"
                  : "text-slate-400 hover:text-slate-200 dark:text-white/60 dark:hover:text-white",
              )}
              title="Pilih dokter dari master"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </button>
          </div>
        )}
      </div>
      {open &&
      !loading &&
      filtered.length > 0 &&
      dropdownPos &&
      typeof document !== "undefined"
        ? createPortal(
            <ul
              id={listboxId}
              role="listbox"
              style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 100050,
              }}
              onMouseDown={() => {
                skipBlurRef.current = true;
              }}
              className={cn(
                "max-h-56 overflow-auto rounded-lg border py-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100",
                isLight
                  ? "border-slate-300 bg-white text-slate-900 shadow-slate-900/20"
                  : "border-cyan-500/40 bg-[#0a1628] text-white shadow-cyan-950/60",
              )}
            >
              {filtered.map((d, idx) => {
                const isHighlighted = idx === highlightIndex;
                return (
                  <li key={d.id} role="presentation">
                    <button
                      id={`${listboxId}-opt-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isHighlighted}
                      className={cn(
                        "w-full px-3 py-1.5 text-left text-xs transition-colors border-b last:border-b-0",
                        isLight
                          ? "border-slate-100 text-slate-900 hover:bg-cyan-50 hover:text-cyan-900"
                          : "border-white/5 text-white hover:bg-[#E8C547]/20",
                        isHighlighted &&
                          (isLight
                            ? "bg-cyan-100/90 font-bold text-cyan-950"
                            : "bg-[#E8C547]/25 font-semibold text-white ring-1 ring-[#E8C547]/40"),
                      )}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        pickOption(d);
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold">{d.nama_dokter}</span>
                        {d.aktif === false && (
                          <span className="text-[10px] text-amber-500">
                            (nonaktif)
                          </span>
                        )}
                      </div>
                      {d.spesialis ? (
                        <span
                          className={cn(
                            "block text-[10px]",
                            isLight ? "text-slate-500" : "text-white/60",
                          )}
                        >
                          {d.spesialis}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
      {open && !loading && options.length === 0 && dropdownPos && typeof document !== "undefined"
        ? createPortal(
            <p
              style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 100050,
              }}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs shadow-xl",
                isLight
                  ? "border-slate-300 bg-white text-slate-800"
                  : "border-white/15 bg-[#0a1628] text-white/85",
              )}
            >
              Belum ada dokter di master. Tambah lewat menu Dokter.
            </p>,
            document.body,
          )
        : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

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
    const n = String(d.nama_dokter ?? "").trim().toLowerCase();
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
  return new RegExp(`\\b${escapeRegex(token)}\\b`, "i").test(haystack);
}

/**
 * Samakan panggilan / nama pendek dengan satu baris master dokter (hanya jika hasilnya tunggal).
 */
export function resolveDoctorFromLooseInput(
  options: DoctorOption[],
  input: string,
): DoctorOption | null {
  if (!options.length) return null;
  const exact = resolveDoctorExactMatch(options, input);
  if (exact) return exact;

  const tokens = doctorQueryTokens(input);
  if (tokens.length === 0) return null;

  const candidates = options.filter((d) => {
    const hay = `${String(d.nama_dokter ?? "")} ${String(d.spesialis ?? "")}`;
    return tokens.every((tok) => tokenMatchesDoctorHaystack(hay, tok));
  });

  if (candidates.length === 1) return candidates[0]!;

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

export function DoctorCombobox({
  value,
  onChange,
  onSelectOption,
  onInputBlur,
  options,
  loading,
  className,
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
  listboxId?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  /** Hindari commit blur saat klik item list. */
  const skipBlurRef = useRef(false);

  const filtered = useMemo(() => {
    const q = normalize(value);
    if (!q) return options;
    return options.filter((d) => {
      const hay = normalize(
        `${d.nama_dokter} ${d.spesialis ?? ""}`
      );
      return hay.includes(q);
    });
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
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
            onInputBlur?.(value.trim());
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          placeholder={
            loading ? "Memuat daftar dokter…" : "Cari / pilih dokter…"
          }
          className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 pr-8 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
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
          {filtered.map((d) => {
            const label = formatDoctorLabel(d);
            return (
              <li key={d.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  className="w-full px-2 py-1.5 text-left text-[11px] text-white hover:bg-[#E8C547]/20 focus:bg-[#E8C547]/25 focus:outline-none"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(label);
                    onSelectOption?.(d);
                    setOpen(false);
                  }}
                >
                  <span className="block font-medium text-white/95">
                    {d.nama_dokter}
                    {d.aktif === false ? (
                      <span className="ml-1 font-normal text-amber-200/80">
                        (nonaktif)
                      </span>
                    ) : null}
                  </span>
                  {d.spesialis ? (
                    <span className="block text-[10px] text-white/50">
                      {d.spesialis}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {open && !loading && options.length === 0 ? (
        <p className="absolute left-0 right-0 top-full z-[60] mt-1 rounded-lg border border-white/15 bg-[#0a1628] px-2 py-2 text-[10px] text-white/55">
          Belum ada dokter di master. Tambah lewat menu Dokter.
        </p>
      ) : null}
    </div>
  );
}

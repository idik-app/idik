"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Baris dari GET /api/ruangan (master `public.ruangan`). */
export type RuanganOption = {
  id: string;
  nama: string;
  kode: string | null;
  kategori: string | null;
  aktif?: boolean;
};

/** Nilai yang disimpan di form / order: nama ruangan (boleh juga diketik manual). */
export function formatRuanganLabel(r: Pick<RuanganOption, "nama" | "kode">): string {
  const nama = (r.nama ?? "").trim();
  const kode = (r.kode ?? "").trim();
  if (nama && kode) return `${nama} (${kode})`;
  return nama || kode;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function RuanganCombobox({
  value,
  onChange,
  options,
  loading,
  className,
  listboxId = "pemakaian-ruangan-listbox",
}: {
  value: string;
  onChange: (label: string) => void;
  options: RuanganOption[];
  loading?: boolean;
  className?: string;
  listboxId?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = normalize(value);
    if (!q) return options;
    return options.filter((r) => {
      const hay = normalize(
        `${r.nama ?? ""} ${r.kode ?? ""} ${r.kategori ?? ""}`,
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
          onFocus={() => setOpen(true)}
          autoComplete="off"
          placeholder={
            loading ? "Memuat daftar ruangan…" : "Cari / pilih ruangan…"
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
          className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-48 overflow-auto rounded-lg border border-white/15 bg-[#0a1628] py-1 shadow-xl"
        >
          {filtered.map((r) => {
            const label = formatRuanganLabel(r);
            const sub = r.kategori?.trim() || null;
            return (
              <li key={r.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  className="w-full px-2 py-1.5 text-left text-[11px] text-white hover:bg-[#E8C547]/20 focus:bg-[#E8C547]/25 focus:outline-none"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(label);
                    setOpen(false);
                  }}
                >
                  <span className="block font-medium text-white/95">
                    {r.nama.trim() || label}
                    {r.aktif === false ? (
                      <span className="ml-1 font-normal text-amber-200/80">
                        (nonaktif)
                      </span>
                    ) : null}
                  </span>
                  {sub ? (
                    <span className="block text-[10px] text-white/50">{sub}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {open && !loading && options.length === 0 ? (
        <p className="absolute left-0 right-0 top-full z-[60] mt-1 rounded-lg border border-white/15 bg-[#0a1628] px-2 py-2 text-[10px] text-white/55">
          Belum ada ruangan di master. Tambah lewat menu{" "}
          <span className="text-[#E8C547]/90">Ruangan</span>.
        </p>
      ) : null}
    </div>
  );
}

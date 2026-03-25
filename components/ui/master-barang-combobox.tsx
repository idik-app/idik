"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type MasterBarangOption = {
  id: string;
  kode: string;
  nama: string;
  jenis: string;
  kategori: string | null;
  satuan?: string | null;
  barcode: string | null;
  distributor_id: string | null;
  distributor_nama: string | null;
};

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

type MenuPos = { top: number; left: number; width: number };

export function MasterBarangCombobox({
  value,
  onChange,
  onPick,
  options,
  loading,
  listboxId,
  /** `table`: daftar `position:fixed` + portal agar tidak terpotong overflow tabel. */
  variant = "default",
}: {
  value: string;
  onChange: (nama: string) => void;
  onPick: (item: MasterBarangOption) => void;
  options: MasterBarangOption[];
  loading?: boolean;
  listboxId: string;
  variant?: "default" | "table";
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(value);
    if (!q) return options;
    return options.filter((o) => {
      const hay = normalize(
        [
          o.nama,
          o.kode,
          o.barcode ?? "",
          o.kategori ?? "",
          o.jenis,
          o.satuan ?? "",
        ].join(" ")
      );
      return hay.includes(q);
    });
  }, [options, value]);

  const updateFixedPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 200),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || variant !== "table") return;
    updateFixedPosition();
    const onScroll = () => updateFixedPosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, variant, updateFixedPosition, filtered.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (variant === "table" && listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, variant]);

  const inputCls =
    variant === "table"
      ? "w-full min-w-[90px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-[10px] text-white/95 placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50 pr-7"
      : "w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 pr-8 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40";

  const listCls = cn(
    "max-h-48 overflow-auto rounded-lg border border-white/15 bg-[#0a1628] py-1 shadow-xl z-[9999]",
    variant === "table" ? "text-[10px]" : "text-[11px]"
  );

  const renderListItems = () => (
    <>
      {filtered.map((o) => (
        <li key={o.id} role="presentation">
          <button
            type="button"
            role="option"
            className={cn(
              "w-full px-2 py-1.5 text-left text-white hover:bg-[#E8C547]/20 focus:bg-[#E8C547]/25 focus:outline-none",
              variant === "table" && "py-1"
            )}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onPick(o);
              setOpen(false);
            }}
          >
            <span className="block font-medium text-white/95">{o.nama}</span>
            <span className="block text-[9px] text-white/45">
              {[o.kode, o.jenis].filter(Boolean).join(" · ")}
              {o.distributor_nama ? ` · ${o.distributor_nama}` : ""}
            </span>
          </button>
        </li>
      ))}
    </>
  );

  const listInner =
    open && !loading && filtered.length > 0 ? (
      <ul
        ref={variant === "table" ? listRef : undefined}
        id={listboxId}
        role="listbox"
        className={cn(
          listCls,
          variant === "default" &&
            "absolute left-0 right-0 top-full z-[60] mt-1"
        )}
        style={
          variant === "table" && menuPos
            ? {
                position: "fixed",
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
              }
            : undefined
        }
      >
        {renderListItems()}
      </ul>
    ) : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          placeholder={
            loading
              ? "Memuat barang…"
              : "Ketik nama / kode / barcode / satuan…"
          }
          className={inputCls}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
        />
        {loading ? (
          <Loader2
            className={cn(
              "pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-[#E8C547]/80",
              variant === "default" && "right-2 h-3.5 w-3.5"
            )}
            aria-hidden
          />
        ) : null}
      </div>
      {variant === "table" && listInner && typeof document !== "undefined"
        ? createPortal(listInner, document.body)
        : listInner}
      {(() => {
        if (!open || loading || options.length > 0) return null;
        const el = (
          <p
            className={cn(
              "rounded-lg border border-white/15 bg-[#0a1628] px-2 py-2 text-[10px] text-white/55 z-[9999]",
              variant === "default" &&
                "absolute left-0 right-0 top-full mt-1 z-[60]"
            )}
            style={
              variant === "table" && menuPos
                ? {
                    position: "fixed",
                    top: menuPos.top,
                    left: menuPos.left,
                    width: menuPos.width,
                  }
                : undefined
            }
          >
            Belum ada master barang. Tambah lewat Farmasi → Master Barang.
          </p>
        );
        if (variant === "table" && typeof document !== "undefined") {
          return createPortal(el, document.body);
        }
        return el;
      })()}
    </div>
  );
}

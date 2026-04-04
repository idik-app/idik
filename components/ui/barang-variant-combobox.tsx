"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { Loader2, PackagePlus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";

/** Satu baris pilihan: master + optional variant distributor_barang (sama dengan modal Cari & tambah). */
export type MasterBarangPickRow = {
  pickId: string;
  master_barang_id: string;
  distributor_barang_id: string | null;
  kode: string;
  nama: string;
  jenis: string;
  kategori: string | null;
  barcode: string | null;
  satuan: string | null;
  distributor_id: string | null;
  distributor_nama: string | null;
  lot: string | null;
  ukuran: string | null;
  ed: string | null;
  /** Harga jual referensi (master / mapping distributor); null jika belum diisi di DB. */
  harga_jual: number | null;
};

export function pickRowSearchHaystack(v: MasterBarangPickRow): string {
  return [
    v.nama,
    v.kode,
    v.barcode ?? "",
    v.kategori ?? "",
    v.jenis,
    v.satuan ?? "",
    v.distributor_nama ?? "",
    v.lot ?? "",
    v.ukuran ?? "",
    v.ed ?? "",
    v.harga_jual != null ? String(v.harga_jual) : "",
  ]
    .join(" ")
    .toLowerCase();
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function alnumOnly(s: string): string {
  return s.replace(/[^a-z0-9]/g, "");
}

/**
 * Cocokkan teks pencarian ke satu baris master:
 * substring pada haystack gabungan, atau tiap kata (spasi) harus muncul sebagai substring,
 * atau substring pada versi haystack alfanumerik saja (abaikan spasi/tanda).
 * Tanpa pencocokan subsekuens di seluruh haystack — itu menimbulkan false positive
 * (mis. "genoss" cocok ke nama lain karena huruf tersebar di nama+kode+distributor).
 */
export function rowMatchesBarangQuery(
  v: MasterBarangPickRow,
  qRaw: string,
): boolean {
  const q = normalize(qRaw);
  if (!q) return true;
  const hay = pickRowSearchHaystack(v);
  if (hay.includes(q)) return true;
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length > 1) {
    return tokens.every((t) => hay.includes(t));
  }
  const qc = alnumOnly(q);
  if (qc.length >= 2) {
    const hayC = alnumOnly(hay);
    if (hayC.includes(qc)) return true;
  }
  return false;
}

/** Konteks baris untuk membedakan varian (nama/kode sama, LOT/ED/distributor beda). */
export type BlurResolveLine = {
  distributor?: string;
  lot?: string;
  ukuran?: string;
  ed?: string;
};

function narrowPickRowsByLine(
  candidates: MasterBarangPickRow[],
  line?: BlurResolveLine,
): MasterBarangPickRow[] {
  if (candidates.length <= 1) return candidates;
  if (!line) return candidates;
  const L = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
  let filtered = candidates;
  const lot = L(line.lot);
  const uk = L(line.ukuran);
  const ed = L(line.ed);
  const dist = L(line.distributor);
  if (lot) {
    const f = filtered.filter((v) => L(v.lot) === lot);
    if (f.length) filtered = f;
  }
  if (uk) {
    const f = filtered.filter((v) => L(v.ukuran) === uk);
    if (f.length) filtered = f;
  }
  if (ed) {
    const f = filtered.filter((v) => L(v.ed) === ed);
    if (f.length) filtered = f;
  }
  if (dist) {
    const f = filtered.filter((v) => L(v.distributor_nama) === dist);
    if (f.length) filtered = f;
  }
  return filtered.length ? filtered : candidates;
}

/**
 * Cocokkan teks kolom Barang ke satu baris master (barcode / kode / LOT / nama persis).
 * Bila banyak varian, sempitkan dengan LOT, ukuran, ED, distributor pada baris bila ada.
 */
export function resolvePickRowFromBarangInput(
  label: string,
  options: MasterBarangPickRow[],
  line?: BlurResolveLine,
): MasterBarangPickRow | undefined {
  const q = label.trim().toLowerCase();
  if (!q) return undefined;
  const L = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

  const byBarcode = options.find((v) => L(v.barcode) === q);
  if (byBarcode) return byBarcode;

  const byKode = options.filter((v) => L(v.kode) === q);
  if (byKode.length === 1) return byKode[0];
  if (byKode.length > 1) {
    const narrowed = narrowPickRowsByLine(byKode, line);
    return narrowed.length === 1 ? narrowed[0] : undefined;
  }

  const byLot = options.filter((v) => {
    const raw = (v.lot ?? "").trim();
    return raw.length > 0 && L(v.lot) === q;
  });
  if (byLot.length === 1) return byLot[0];
  if (byLot.length > 1) {
    const narrowed = narrowPickRowsByLine(byLot, line);
    return narrowed.length === 1 ? narrowed[0] : undefined;
  }

  const sameNama = options.filter((v) => L(v.nama) === q);
  if (sameNama.length === 1) return sameNama[0];
  if (sameNama.length > 1) {
    const narrowed = narrowPickRowsByLine(sameNama, line);
    return narrowed.length === 1 ? narrowed[0] : undefined;
  }

  return undefined;
}

type MenuPos = { top: number; left: number; width: number };

export function BarangVariantCombobox({
  value,
  onChange,
  onPickVariant,
  options,
  loading,
  listboxId,
  variant = "default",
  blurResolveLine,
  onRequestAddProduct,
  autoFocus,
}: {
  value: string;
  onChange: (nama: string) => void;
  onPickVariant: (row: MasterBarangPickRow) => void;
  options: MasterBarangPickRow[];
  loading?: boolean;
  listboxId: string;
  variant?: "default" | "table";
  /** Isi kolom lain pada baris yang sama agar resolusi varian tidak ambigu. */
  blurResolveLine?: BlurResolveLine;
  /** Saat tidak ada hasil / katalog kosong: tombol membuka alur tambah produk (mis. modal induk). */
  onRequestAddProduct?: (draftQuery: string) => void;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const emptyPanelRef = useRef<HTMLDivElement>(null);
  const loadingPanelRef = useRef<HTMLDivElement>(null);
  const blurCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(value);
    /** Tanpa teks pencarian jangan tampilkan seluruh katalog — cukup ketik nama/kode/dll. */
    if (!q) return [];
    return options.filter((v) => rowMatchesBarangQuery(v, value));
  }, [options, value]);

  const updateFixedPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 280),
    });
  }, []);

  /** Di modal/stacking tinggi: posisi harus ada di frame yang sama agar portal terlihat. */
  const syncMenuPositionImmediate = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    flushSync(() => {
      setMenuPos({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 280),
      });
    });
  }, []);

  const clearBlurCloseTimer = useCallback(() => {
    if (blurCloseTimerRef.current) {
      clearTimeout(blurCloseTimerRef.current);
      blurCloseTimerRef.current = null;
    }
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
  }, [open, variant, updateFixedPosition, filtered.length, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (variant === "table" && listRef.current?.contains(t)) return;
      if (variant === "table" && emptyPanelRef.current?.contains(t)) return;
      if (variant === "table" && loadingPanelRef.current?.contains(t)) return;
      clearBlurCloseTimer();
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, variant, clearBlurCloseTimer]);

  useEffect(
    () => () => {
      if (blurCloseTimerRef.current) {
        clearTimeout(blurCloseTimerRef.current);
        blurCloseTimerRef.current = null;
      }
    },
    [],
  );

  const inputCls =
    variant === "table"
      ? "w-full min-w-[90px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-[10px] text-white/95 placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50 pr-7"
      : "w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 pr-8 text-[11px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40";

  const listCls = cn(
    "max-h-48 overflow-auto rounded-lg border border-white/15 bg-[#0a1628] py-1 shadow-xl pointer-events-auto",
    variant === "table" ? "text-[10px]" : "text-[11px]",
    variant === "table" ? UI_LAYERS.pickerFloating : UI_LAYERS.popover,
  );

  const renderListItems = () => (
    <>
      {filtered.map((v) => (
        <li key={v.pickId} role="presentation">
          <button
            type="button"
            role="option"
            className={cn(
              "w-full px-2 py-1.5 text-left text-white hover:bg-[#E8C547]/20 focus:bg-[#E8C547]/25 focus:outline-none",
              variant === "table" && "py-1"
            )}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onPickVariant(v);
              setOpen(false);
            }}
          >
            <span className="block font-medium text-white/95">{v.nama}</span>
            <span className="block text-[9px] text-white/50 mt-0.5 space-x-1">
              {[v.kode && `Kode: ${v.kode}`, v.jenis].filter(Boolean).join(" · ")}
            </span>
            {(v.lot || v.ukuran || v.ed || v.distributor_nama) && (
              <span className="block text-[9px] text-teal-200/90 mt-0.5">
                {[
                  v.lot && `LOT ${v.lot}`,
                  v.ukuran && `Uk. ${v.ukuran}`,
                  v.ed && `ED ${v.ed}`,
                  v.distributor_nama && v.distributor_nama,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </button>
        </li>
      ))}
    </>
  );

  const qActive = normalize(value).length > 0;

  const tableListReady = variant !== "table" || menuPos != null;

  const loadingEl =
    open && loading && tableListReady ? (
      <div
        ref={variant === "table" ? loadingPanelRef : undefined}
        className={cn(
          "rounded-lg border border-white/15 bg-[#0a1628] px-2 py-2 shadow-xl pointer-events-auto",
          variant === "table" ? UI_LAYERS.pickerFloating : UI_LAYERS.popover,
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
        <div className="flex items-center gap-2 px-1 py-1.5 text-[10px] text-white/75 dark:text-white/90">
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[#E8C547]/80" />
          Memuat katalog…
        </div>
      </div>
    ) : null;

  const listInner =
    open && !loading && filtered.length > 0 && tableListReady ? (
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

  const emptyMsg =
    open && !loading && options.length === 0
      ? "Belum ada data master / mapping distributor."
      : open && !loading && options.length > 0 && filtered.length === 0 && qActive
        ? "Tidak ada baris yang cocok dengan pencarian."
        : null;

  const emptyEl = emptyMsg ? (
    <div
      ref={emptyPanelRef}
      className={cn(
        "rounded-lg border border-white/15 bg-[#0a1628] px-2 py-2 text-[10px] pointer-events-auto",
        variant === "table" ? UI_LAYERS.pickerFloating : UI_LAYERS.popover,
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
      <p className="text-white/55 dark:text-white/85">{emptyMsg}</p>
      {onRequestAddProduct ? (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRequestAddProduct(value.trim());
            setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            e.stopPropagation();
            onRequestAddProduct(value.trim());
            setOpen(false);
          }}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-[#E8C547]/40 bg-[#E8C547]/10 px-2 py-1.5 text-[10px] font-semibold text-[#E8C547] hover:bg-[#E8C547]/20 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
        >
          <PackagePlus className="h-3 w-3 shrink-0" aria-hidden />
          Tambah produk
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
            onChange={(e) => {
            clearBlurCloseTimer();
            const next = e.target.value;
            onChange(next);
            setOpen(true);
            if (variant === "table") {
              syncMenuPositionImmediate();
            }
            // Autofill kolom varian (sama seperti onBlur) begitu teks persis cocok barcode/kode/LOT/nama.
            if (loading || options.length === 0) return;
            const picked = resolvePickRowFromBarangInput(
              next,
              options,
              blurResolveLine,
            );
            if (picked) onPickVariant(picked);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              if (
                !open &&
                options.length > 0 &&
                !loading &&
                normalize(value).length > 0
              ) {
                e.preventDefault();
                setOpen(true);
                if (variant === "table") {
                  syncMenuPositionImmediate();
                }
              }
              return;
            }
            if (e.key !== "Enter") return;
            if (loading || !open) return;
            if (filtered.length === 0) return;
            e.preventDefault();
            onPickVariant(filtered[0]);
            setOpen(false);
          }}
          onBlur={(e) => {
            const rt = e.relatedTarget;
            if (
              rt instanceof Node &&
              (listRef.current?.contains(rt) ||
                emptyPanelRef.current?.contains(rt) ||
                loadingPanelRef.current?.contains(rt))
            ) {
              return;
            }
            clearBlurCloseTimer();
            blurCloseTimerRef.current = setTimeout(() => {
              blurCloseTimerRef.current = null;
              setOpen(false);
              if (loading || options.length === 0) return;
              const picked = resolvePickRowFromBarangInput(
                valueRef.current,
                options,
                blurResolveLine,
              );
              if (picked) onPickVariant(picked);
            }, 200);
          }}
          onFocus={() => {
            clearBlurCloseTimer();
            if (normalize(value).length > 0) {
              setOpen(true);
              if (variant === "table") {
                syncMenuPositionImmediate();
              }
            }
          }}
          autoComplete="off"
          placeholder={
            loading
              ? "Memuat katalog…"
              : "Nama, kode, barcode, LOT, ukuran, ED, distributor…"
          }
          className={inputCls}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          autoFocus={autoFocus}
        />
        {loading ? (
          <Loader2
            className={cn(
              "pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-[#E8C547]/80",
              variant === "default" && "right-2 h-3.5 w-3.5"
            )}
            aria-hidden
          />
        ) : normalize(value).length > 0 ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              clearBlurCloseTimer();
              onChange("");
              setOpen(false);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded p-0.5 text-white/70 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50 dark:text-white/85",
              variant === "table" ? "right-1" : "right-1.5"
            )}
            aria-label="Hapus teks"
            title="Hapus teks"
          >
            <X className={cn("shrink-0", variant === "table" ? "h-3 w-3" : "h-3.5 w-3.5")} />
          </button>
        ) : null}
      </div>
      {variant === "table" && listInner && typeof document !== "undefined"
        ? createPortal(listInner, document.body)
        : listInner}
      {variant === "table" && loadingEl && typeof document !== "undefined"
        ? createPortal(loadingEl, document.body)
        : loadingEl}
      {(() => {
        if (!open || loading || !emptyMsg) return null;
        if (variant === "table" && !menuPos) return null;
        if (variant === "table" && typeof document !== "undefined") {
          return createPortal(emptyEl, document.body);
        }
        return emptyEl;
      })()}
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

/** Indeks kolom 0..12 — selaras urutan `<td>` baris utama tabel tindakan */
export const TINDAKAN_TABLE_COL = {
  NO: 0,
  TANGGAL: 1,
  TIME_OUT: 2,
  RM: 3,
  NAMA_PASIEN: 4,
  RS_KET: 5,
  UMUR: 6,
  JENIS_KELAMIN: 7,
  DOKTER: 8,
  TINDAKAN: 9,
  RUANGAN: 10,
  STATUS: 11,
  AKSI: 12,
} as const;

export const TINDAKAN_TABLE_COL_COUNT = 13;

export type TindakanCellRect = {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
};

function normalizeRect(a: { r: number; c: number }, b: { r: number; c: number }): TindakanCellRect {
  return {
    r1: Math.min(a.r, b.r),
    c1: Math.min(a.c, b.c),
    r2: Math.max(a.r, b.r),
    c2: Math.max(a.c, b.c),
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function isDocumentTypingFocus(): boolean {
  const a = document.activeElement;
  return (
    a instanceof HTMLInputElement ||
    a instanceof HTMLTextAreaElement ||
    a instanceof HTMLSelectElement ||
    (a instanceof HTMLElement && a.isContentEditable)
  );
}

/**
 * Pilihan teks asli di luar `<table>` (drawer, modal, judul) harus disalin oleh browser,
 * bukan diganti TSV sel — listener `copy` global memakai capture sehingga tanpa ini
 * yang tersalin bisa No. RM dari sel yang masih ter-blok di belakang.
 */
function domTextSelectionShouldUseNativeCopy(table: HTMLTableElement | null): boolean {
  if (!table) return false;
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  if (sel.toString().trim() === "") return false;

  const hostEl = (n: Node | null): Element | null => {
    if (!n) return null;
    return n.nodeType === Node.TEXT_NODE ? n.parentElement : (n as Element);
  };

  const range = sel.getRangeAt(0);
  const startEl = hostEl(range.startContainer);
  const endEl = hostEl(range.endContainer);
  if (!startEl || !endEl) return false;
  const fullyInsideTable = table.contains(startEl) && table.contains(endEl);
  return !fullyInsideTable;
}

/** Target klik mengarah ke kontrol isian — jangan mulai seleksi blok */
export function isTindakanCellSelectInteractiveTarget(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'input,textarea,select,button,a,[role="combobox"],[role="listbox"],[role="option"],[contenteditable],[data-no-spreadsheet-select]',
    ),
  );
}

function rectContains(r: TindakanCellRect, row: number, col: number) {
  return (
    row >= r.r1 &&
    row <= r.r2 &&
    col >= r.c1 &&
    col <= r.c2
  );
}

function extractCellPlainTextFromTd(td: HTMLTableCellElement): string {
  const control = td.querySelector("input,select,textarea");
  if (
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement
  ) {
    return String(control.value ?? "").trim();
  }
  return td.innerText.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
}

/** Satu rentang → teks TSV (tab antar kolom, newline antar baris) */
export function tindakanSelectionRectToTsv(
  table: HTMLTableElement,
  rect: TindakanCellRect,
): string {
  const lines: string[] = [];
  for (let r = rect.r1; r <= rect.r2; r++) {
    const cols: string[] = [];
    for (let c = rect.c1; c <= rect.c2; c++) {
      const td = table.querySelector(
        `td[data-tindakan-r="${r}"][data-tindakan-c="${c}"]`,
      );
      cols.push(
        td instanceof HTMLTableCellElement
          ? extractCellPlainTextFromTd(td)
          : "",
      );
    }
    lines.push(cols.join("\t"));
  }
  return lines.join("\n");
}

export function parseTsvMatrix(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized.split("\n").map((line) => line.split("\t"));
}

export type TindakanTableCellSelectionOptions = {
  tableRef?: RefObject<HTMLTableElement | null>;
  /** Isi setiap render dengan handler tempel terbaru (boleh async) */
  onPasteMatrixRef?: RefObject<
    ((matrix: string[][], anchor: TindakanCellRect) => void | Promise<void>) | null
  >;
};

export function useTindakanTableCellSelection(
  pageRowCount: number,
  options?: TindakanTableCellSelectionOptions,
) {
  const [ranges, setRanges] = useState<TindakanCellRect[]>([]);
  const rangesRef = useRef<TindakanCellRect[]>([]);
  rangesRef.current = ranges;
  const anchorRef = useRef<{ r: number; c: number } | null>(null);
  const dragRef = useRef<{
    mode: "extend" | "add";
    anchor: { r: number; c: number };
    maxR: number;
    maxC: number;
  } | null>(null);
  const didDragRef = useRef(false);
  const maxR0 = Math.max(0, pageRowCount - 1);
  const maxC0 = TINDAKAN_TABLE_COL_COUNT - 1;

  const clearSelection = useCallback(() => {
    setRanges([]);
    anchorRef.current = null;
    dragRef.current = null;
  }, []);

  const isCellSelected = useCallback(
    (r: number, c: number) => ranges.some((rng) => rectContains(rng, r, c)),
    [ranges],
  );

  const readCellUnderPoint = useCallback(
    (clientX: number, clientY: number): { r: number; c: number } | null => {
      const el = document.elementFromPoint(clientX, clientY);
      const td = el?.closest?.("td[data-tindakan-cell]") ?? null;
      if (!(td instanceof HTMLElement)) return null;
      const r = Number(td.dataset.tindakanR);
      const c = Number(td.dataset.tindakanC);
      if (Number.isNaN(r) || Number.isNaN(c)) return null;
      return {
        r: clamp(r, 0, maxR0),
        c: clamp(c, 0, maxC0),
      };
    },
    [maxR0, maxC0],
  );

  const onCellPointerDown = useCallback(
    (e: ReactPointerEvent, rowIndex: number, colIndex: number) => {
      if (e.button !== 0) return;
      if (isTindakanCellSelectInteractiveTarget(e.target)) return;

      e.stopPropagation();
      e.preventDefault();

      const r = clamp(rowIndex, 0, maxR0);
      const c = clamp(colIndex, 0, maxC0);
      didDragRef.current = false;

      if (e.shiftKey && anchorRef.current) {
        const rect = normalizeRect(anchorRef.current, { r, c });
        setRanges([rect]);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        anchorRef.current = { r, c };
        dragRef.current = {
          mode: "add",
          anchor: { r, c },
          maxR: r,
          maxC: c,
        };
        setRanges((prev) => {
          const next = [...prev, { r1: r, c1: c, r2: r, c2: c }];
          return next;
        });
      } else {
        anchorRef.current = { r, c };
        dragRef.current = {
          mode: "extend",
          anchor: { r, c },
          maxR: r,
          maxC: c,
        };
        setRanges([{ r1: r, c1: c, r2: r, c2: c }]);
      }

      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        didDragRef.current = true;
        const cell = readCellUnderPoint(ev.clientX, ev.clientY);
        if (!cell) return;
        const { mode, anchor } = dragRef.current;
        const rect = normalizeRect(anchor, cell);
        dragRef.current = {
          ...dragRef.current,
          maxR: cell.r,
          maxC: cell.c,
        };
        if (mode === "extend") {
          setRanges([rect]);
        } else {
          setRanges((prev) => {
            if (prev.length === 0) return [rect];
            const copy = [...prev];
            copy[copy.length - 1] = rect;
            return copy;
          });
        }
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [maxR0, maxC0, readCellUnderPoint],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearSelection();
        return;
      }

      const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const;
      const key = e.key as (typeof arrows)[number];
      if (!arrows.includes(key)) return;

      const rs = rangesRef.current;
      if (rs.length === 0) return;
      if (isDocumentTypingFocus()) return;

      const dr = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
      const dc = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;

      e.preventDefault();

      if (e.shiftKey) {
        setRanges((prev) => {
          if (prev.length === 0) return prev;
          const rng = prev[prev.length - 1]!;
          const start = { r: rng.r1, c: rng.c1 };
          const end = {
            r: clamp(rng.r2 + dr, 0, maxR0),
            c: clamp(rng.c2 + dc, 0, maxC0),
          };
          const nextR = normalizeRect(start, end);
          return [...prev.slice(0, -1), nextR];
        });
        return;
      }

      const last = rs[rs.length - 1]!;
      let nr = last.r2 + dr;
      let nc = last.c2 + dc;
      nr = clamp(nr, 0, maxR0);
      nc = clamp(nc, 0, maxC0);
      const single: TindakanCellRect = {
        r1: nr,
        c1: nc,
        r2: nr,
        c2: nc,
      };
      setRanges([single]);
      anchorRef.current = { r: nr, c: nc };
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearSelection, maxR0, maxC0]);

  useEffect(() => {
    const tableRef = options?.tableRef;
    if (!tableRef) return;

    const onCopy = (e: ClipboardEvent) => {
      const table = tableRef.current;
      if (domTextSelectionShouldUseNativeCopy(table)) return;

      const rs = rangesRef.current;
      if (rs.length === 0) return;
      if (isDocumentTypingFocus()) return;

      if (!table) return;

      const chunks = rs.map((rect) =>
        tindakanSelectionRectToTsv(table, rect),
      );
      const text = chunks.filter((s) => s.length > 0).join("\n\n");
      if (!text) return;

      e.preventDefault();
      e.clipboardData?.setData("text/plain", text);
    };

    document.addEventListener("copy", onCopy, true);
    return () => document.removeEventListener("copy", onCopy, true);
  }, [options?.tableRef]);

  useEffect(() => {
    const pasteRef = options?.onPasteMatrixRef;
    if (!pasteRef) return;

    const onPaste = (e: ClipboardEvent) => {
      if (rangesRef.current.length === 0) return;
      if (isDocumentTypingFocus()) return;

      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!text.trim()) return;

      const matrix = parseTsvMatrix(text);
      if (matrix.length === 0) return;

      const handler = pasteRef.current;
      if (!handler) return;

      e.preventDefault();
      const anchor = rangesRef.current[0]!;
      void Promise.resolve(handler(matrix, anchor));
    };

    document.addEventListener("paste", onPaste, true);
    return () => document.removeEventListener("paste", onPaste, true);
  }, [options?.onPasteMatrixRef]);

  const consumeRowClickIfSelectionDrag = useCallback(() => {
    if (!didDragRef.current) return false;
    didDragRef.current = false;
    return true;
  }, []);

  const getTdProps = useCallback(
    (rowIndex: number, colIndex: number) =>
      ({
        "data-tindakan-cell": true as const,
        "data-tindakan-r": rowIndex,
        "data-tindakan-c": colIndex,
        onPointerDown: (e: ReactPointerEvent<HTMLTableCellElement>) =>
          onCellPointerDown(e, rowIndex, colIndex),
      }) as const,
    [onCellPointerDown],
  );

  return {
    ranges,
    isCellSelected,
    onCellPointerDown,
    clearSelection,
    consumeRowClickIfSelectionDrag,
    getTdProps,
  };
}

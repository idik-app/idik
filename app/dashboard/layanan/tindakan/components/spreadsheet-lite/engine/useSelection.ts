"use client";

import { useCallback, useState } from "react";
import {
  MultiSelection,
  SelectionRange,
  SelectionPoint,
  SpreadsheetState,
} from "./types";
import { useSpreadsheetCore } from "./useSpreadsheetCore";

/* ===========================================================
   Helper Functions
   =========================================================== */

function normalizeRange(a: SelectionPoint, b: SelectionPoint): SelectionRange {
  return {
    start: {
      r: Math.min(a.r, b.r),
      c: Math.min(a.c, b.c),
    },
    end: {
      r: Math.max(a.r, b.r),
      c: Math.max(a.c, b.c),
    },
  };
}

function pointInRange(p: SelectionPoint, r: SelectionRange): boolean {
  return (
    p.r >= r.start.r && p.r <= r.end.r && p.c >= r.start.c && p.c <= r.end.c
  );
}

/* ===========================================================
   useSelection — MASTER SELECTION ENGINE
   =========================================================== */

export function useSelection() {
  const { state, setSelection } = useSpreadsheetCore();
  const { selection, freeze, virtual } = state;

  const [anchor, setAnchor] = useState<SelectionPoint | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  /* ===========================================================
     SELECT SINGLE CELL
     =========================================================== */
  const selectCell = useCallback(
    (r: number, c: number) => {
      const range: SelectionRange = {
        start: { r, c },
        end: { r, c },
      };

      setAnchor({ r, c });

      setSelection({
        ranges: [range],
      });
    },
    [setSelection]
  );

  /* ===========================================================
     SELECT RANGE (Shift + click / Drag)
     =========================================================== */
  const expandSelection = useCallback(
    (r: number, c: number) => {
      if (!anchor) return;

      const newRange = normalizeRange(anchor, { r, c });

      setSelection({
        ranges: [newRange],
      });
    },
    [anchor, setSelection]
  );

  /* ===========================================================
     START DRAG SELECTION
     =========================================================== */
  const startDrag = useCallback((r: number, c: number) => {
    setAnchor({ r, c });
    setIsDragging(true);

    setSelection({
      ranges: [
        {
          start: { r, c },
          end: { r, c },
        },
      ],
    });
  }, []);

  /* ===========================================================
     UPDATE DRAG SELECTION
     =========================================================== */
  const updateDrag = useCallback(
    (r: number, c: number) => {
      if (!isDragging || !anchor) return;

      const normalized = normalizeRange(anchor, { r, c });

      setSelection({
        ranges: [normalized],
      });
    },
    [isDragging, anchor, setSelection]
  );

  /* ===========================================================
     END DRAG
     =========================================================== */
  const endDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  /* ===========================================================
     MULTI-RANGE SELECTION (CTRL+CLICK)
     =========================================================== */
  const toggleAddRange = useCallback(
    (r: number, c: number) => {
      const newRanges = [...selection.ranges];
      const point = { r, c };

      const inExisting = newRanges.some((rng) => pointInRange(point, rng));

      if (!inExisting) {
        // Add new range
        newRanges.push({
          start: point,
          end: point,
        });
      } else {
        // Remove existing range
        const filtered = newRanges.filter((rng) => !pointInRange(point, rng));
        setSelection({ ranges: filtered });
        return;
      }

      setSelection({ ranges: newRanges });
    },
    [selection, setSelection]
  );

  /* ===========================================================
     KEYBOARD NAVIGATION
     =========================================================== */
  const moveSelection = useCallback(
    (dir: "up" | "down" | "left" | "right") => {
      const rng = selection.ranges[0];
      if (!rng) return;

      const { start, end } = rng;
      const target =
        dir === "up"
          ? { r: start.r - 1, c: start.c }
          : dir === "down"
          ? { r: end.r + 1, c: end.c }
          : dir === "left"
          ? { r: start.r, c: start.c - 1 }
          : { r: start.r, c: end.c + 1 };

      const newR = Math.max(0, target.r);
      const newC = Math.max(0, target.c);

      selectCell(newR, newC);
      setAnchor({ r: newR, c: newC });
    },
    [selection, selectCell]
  );

  /* ===========================================================
     SHIFT + ARROW (EXPAND)
     =========================================================== */
  const shiftMoveExpand = useCallback(
    (dir: "up" | "down" | "left" | "right") => {
      const rng = selection.ranges[0];
      if (!rng || !anchor) return;

      const { end } = rng;

      const target =
        dir === "up"
          ? { r: end.r - 1, c: end.c }
          : dir === "down"
          ? { r: end.r + 1, c: end.c }
          : dir === "left"
          ? { r: end.r, c: end.c - 1 }
          : { r: end.r, c: end.c + 1 };

      const newR = Math.max(0, target.r);
      const newC = Math.max(0, target.c);

      expandSelection(newR, newC);
    },
    [selection, anchor]
  );

  /* ===========================================================
     GET ACTIVE SELECTION RANGE
     =========================================================== */
  const activeRange = selection.ranges[0] || null;

  /* ===========================================================
     FREEZE-AWARE SELECTION (prevent crossing freeze boundary)
     =========================================================== */
  const clampToFreeze = useCallback(
    (r: number, c: number): SelectionPoint => {
      const maxFrozenCol = freeze.frozenColumns - 1;
      const maxFrozenRow = freeze.frozenRows - 1;

      const isFrozenCol = c <= maxFrozenCol;
      const isFrozenRow = r <= maxFrozenRow;

      return {
        r: isFrozenRow ? Math.max(0, r) : r,
        c: isFrozenCol ? Math.max(0, c) : c,
      };
    },
    [freeze]
  );

  /* ===========================================================
     RETURN API
     =========================================================== */
  return {
    selection,
    activeRange,

    isDragging,
    startDrag,
    updateDrag,
    endDrag,

    selectCell,
    expandSelection,
    toggleAddRange,

    moveSelection,
    shiftMoveExpand,

    clampToFreeze,
  };
}

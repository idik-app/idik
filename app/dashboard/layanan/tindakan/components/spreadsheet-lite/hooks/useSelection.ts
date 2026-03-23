"use client";

import { useState, useCallback } from "react";

/**
 * useSelection v1.2
 * Sistem seleksi Spreadsheet-Lite (cell, row, column + keyboard navigation)
 */

export interface CellPos {
  r: number;
  c: number;
}

export function useSelection() {
  /* ============================
   *  STATE
   * ============================ */
  const [activeCell, setActiveCell] = useState<CellPos | null>(null);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [activeColumn, setActiveColumn] = useState<number | null>(null);

  /* ============================
   *  ACTIONS: SELECT
   * ============================ */

  const selectCell = useCallback((r: number, c: number) => {
    setActiveCell({ r, c });
    setActiveRow(null);
    setActiveColumn(null);
  }, []);

  const selectRow = useCallback((r: number) => {
    setActiveRow(r);
    setActiveCell(null);
    setActiveColumn(null);
  }, []);

  const selectColumn = useCallback((c: number) => {
    setActiveColumn(c);
    setActiveCell(null);
    setActiveRow(null);
  }, []);

  const clearSelection = useCallback(() => {
    setActiveCell(null);
    setActiveRow(null);
    setActiveColumn(null);
  }, []);

  /* ============================
   *  KEYBOARD MOVEMENT
   * ============================ */

  const moveUp = useCallback(() => {
    if (!activeCell) return;
    setActiveCell({
      r: Math.max(0, activeCell.r - 1),
      c: activeCell.c,
    });
  }, [activeCell]);

  const moveDown = useCallback(
    (maxRows: number) => {
      if (!activeCell) return;
      setActiveCell({
        r: Math.min(maxRows - 1, activeCell.r + 1),
        c: activeCell.c,
      });
    },
    [activeCell]
  );

  const moveLeft = useCallback(() => {
    if (!activeCell) return;
    setActiveCell({
      r: activeCell.r,
      c: Math.max(0, activeCell.c - 1),
    });
  }, [activeCell]);

  const moveRight = useCallback(
    (maxCols: number) => {
      if (!activeCell) return;
      setActiveCell({
        r: activeCell.r,
        c: Math.min(maxCols - 1, activeCell.c + 1),
      });
    },
    [activeCell]
  );

  return {
    /* State */
    activeCell,
    activeRow,
    activeColumn,

    /* Selection mutation */
    selectCell,
    selectRow,
    selectColumn,
    clearSelection,

    /* Keyboard */
    moveUp,
    moveDown,
    moveLeft,
    moveRight,
  };
}

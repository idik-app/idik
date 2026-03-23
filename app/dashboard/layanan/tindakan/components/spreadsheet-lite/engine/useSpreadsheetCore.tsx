"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  SpreadsheetState,
  GridRow,
  GridColumn,
  MultiSelection,
  FreezeConfig,
  ClipboardBlock,
  SortRule,
  FilterRule,
  VirtualState,
  HistoryStack,
} from "./types";

/* ===========================================================
   INITIAL HELPERS
=========================================================== */

function createInitialRows(rowCount: number, colCount: number): GridRow[] {
  return Array.from({ length: rowCount }, (_, r) => ({
    id: `row-${r}`,
    cells: Array.from({ length: colCount }, (_, c) => ({
      r,
      c,
      value: "",
      formula: null,
      display: "",
    })),
  }));
}

function createInitialColumns(colCount: number): GridColumn[] {
  return Array.from({ length: colCount }, (_, c) => ({
    id: `col-${c}`,
    name: `Kolom ${c + 1}`,
    width: 120,
    frozen: false,
  }));
}

/* ===========================================================
   CONTEXT SETUP
=========================================================== */

interface SpreadsheetCoreContextType {
  state: SpreadsheetState;

  /* Row / Column operations */
  setRows: React.Dispatch<React.SetStateAction<GridRow[]>>;
  setColumns: React.Dispatch<React.SetStateAction<GridColumn[]>>;

  /* Selection */
  setSelection: (sel: MultiSelection) => void;

  /* Freeze */
  setFreeze: (config: FreezeConfig) => void;

  /* Clipboard */
  setClipboard: (cb: ClipboardBlock[] | null) => void;

  /* Sort + Filter */
  setSortRules: (fn: (prev: SortRule[]) => SortRule[]) => void;
  setFilterRules: (fn: (prev: FilterRule[]) => FilterRule[]) => void;

  /* Virtual scroll */
  updateVirtualScroll: (scrollTop: number, viewportHeight: number) => void;

  /* History */
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

const SpreadsheetCoreContext = createContext<SpreadsheetCoreContextType | null>(
  null
);

/* ===========================================================
   PROVIDER
=========================================================== */

export function SpreadsheetCoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [rows, setRows] = useState<GridRow[]>(createInitialRows(100, 5));
  const [columns, setColumns] = useState<GridColumn[]>(createInitialColumns(5));

  /* Selection */
  const [selection, setSelectionState] = useState<MultiSelection>({
    ranges: [],
  });

  /* Freeze */
  const [freeze, setFreezeState] = useState<FreezeConfig>({
    frozenColumns: 1,
    frozenRows: 1,
  });

  /* Clipboard */
  const [clipboard, setClipboard] = useState<ClipboardBlock[] | null>(null);

  /* Sort + Filter */
  const [sortRules, setSortRules] = useState<SortRule[]>([]);
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  /* Virtual Scroll */
  const [virtual, setVirtual] = useState<VirtualState>({
    viewportHeight: 600,
    rowHeight: 32,
    scrollTop: 0,
    visible: {
      startRow: 0,
      endRow: 40,
      totalRows: rows.length,
    },
  });

  /* History (undo/redo 5 langkah) */
  const [history, setHistory] = useState<HistoryStack>({
    undo: [],
    redo: [],
  });

  /* ===========================================================
     SELECTION HANDLER
  ========================================================== */
  const setSelection = useCallback((sel: MultiSelection) => {
    setSelectionState(sel);
  }, []);

  /* ===========================================================
     FREEZE HANDLER
  ========================================================== */
  const setFreeze = useCallback((config: FreezeConfig) => {
    setFreezeState(config);
  }, []);

  /* ===========================================================
     HISTORY HANDLER
  ========================================================== */
  const pushHistory = useCallback(() => {
    setHistory((prev) => {
      const entry = {
        rows: JSON.parse(JSON.stringify(rows)),
        columns: JSON.parse(JSON.stringify(columns)),
        selection,
      };

      const undo = [entry, ...prev.undo].slice(0, 5);
      return { undo, redo: [] };
    });
  }, [rows, columns, selection]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.undo.length === 0) return prev;
      const [latest, ...restUndo] = prev.undo;

      const redoEntry = {
        rows,
        columns,
        selection,
      };

      setRows(latest.rows);
      setColumns(latest.columns);
      setSelection(latest.selection);

      return {
        undo: restUndo,
        redo: [redoEntry, ...prev.redo],
      };
    });
  }, [rows, columns, selection]);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.redo.length === 0) return prev;
      const [latest, ...restRedo] = prev.redo;

      const undoEntry = {
        rows,
        columns,
        selection,
      };

      setRows(latest.rows);
      setColumns(latest.columns);
      setSelection(latest.selection);

      return {
        undo: [undoEntry, ...prev.undo],
        redo: restRedo,
      };
    });
  }, [rows, columns, selection]);

  /* ===========================================================
     VIRTUAL SCROLL (untuk >20.000 baris)
  ========================================================== */
  const updateVirtualScroll = useCallback(
    (scrollTop: number, viewportHeight: number) => {
      const rowHeight = virtual.rowHeight;
      const totalRows = rows.length;

      const startRow = Math.floor(scrollTop / rowHeight);
      const endRow = Math.min(
        totalRows,
        startRow + Math.ceil(viewportHeight / rowHeight) + 5 // buffer rows
      );

      setVirtual((prev) => ({
        ...prev,
        viewportHeight,
        scrollTop,
        visible: {
          startRow,
          endRow,
          totalRows,
        },
      }));
    },
    [rows.length, virtual.rowHeight]
  );

  /* ===========================================================
     AGGREGATE STATE
  ========================================================== */
  const state: SpreadsheetState = useMemo(
    () => ({
      rows,
      columns,
      selection,
      clipboard,
      freeze,
      sortRules,
      filterRules,
      virtual,
      history,
    }),
    [
      rows,
      columns,
      selection,
      clipboard,
      freeze,
      sortRules,
      filterRules,
      virtual,
      history,
    ]
  );

  /* ===========================================================
     PROVIDE CONTEXT
  ========================================================== */
  return (
    <SpreadsheetCoreContext.Provider
      value={{
        state,
        setRows,
        setColumns,
        setSelection,
        setFreeze,
        setClipboard,
        setSortRules,
        setFilterRules,
        updateVirtualScroll,
        pushHistory,
        undo,
        redo,
      }}
    >
      {children}
    </SpreadsheetCoreContext.Provider>
  );
}

/* ===========================================================
   HOOK
=========================================================== */
export function useSpreadsheetCore() {
  const ctx = useContext(SpreadsheetCoreContext);
  if (!ctx) throw new Error("SpreadsheetCore must be used inside Provider.");
  return ctx;
}

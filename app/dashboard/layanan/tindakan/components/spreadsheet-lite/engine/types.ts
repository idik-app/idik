/* ===========================================================
   Spreadsheet-Lite JARVIS Engine — Types v1.0
   Mencakup semua fitur: 
   - Multi-range selection
   - Freeze row/column
   - Virtual scroll
   - Clipboard multi-block
   - Sort multi-level (Excel mode)
   - Filter advanced (Sheets mode)
   - Formula AST
   =========================================================== */

export type CellValue = string | number | boolean | null;

export interface GridCell {
  r: number; // row index
  c: number; // column index
  value: CellValue; // raw cell value
  formula?: string | null; // =SUM(A1:A5)
  display?: string; // formatted value
}

export interface GridRow {
  id: string;
  cells: GridCell[];
}

export interface GridColumn {
  id: string;
  name: string;
  width: number;
  frozen?: boolean;
}

/* ===========================================================
   SELECTION SYSTEM
   Mendukung: 
   - single cell
   - multi-cell
   - multi-range selection
   =========================================================== */

export interface SelectionPoint {
  r: number;
  c: number;
}

export interface SelectionRange {
  start: SelectionPoint;
  end: SelectionPoint;
}

export interface MultiSelection {
  ranges: SelectionRange[];
}

/* ===========================================================
   FREEZE SYSTEM — dynamic freeze
   =========================================================== */
export interface FreezeConfig {
  frozenColumns: number; // freeze kolom 0..N
  frozenRows: number; // freeze baris 0..M
}

/* ===========================================================
   CLIPBOARD SYSTEM — multi-block compatible
   =========================================================== */
export interface ClipboardBlock {
  cells: CellValue[][];
  start: SelectionPoint;
}

/* ===========================================================
   SORT SYSTEM — multi-level (Excel-style)
   =========================================================== */
export type SortDirection = "asc" | "desc";

export interface SortRule {
  columnIndex: number;
  direction: SortDirection;
  priority: number; // multi-layer sort
}

/* ===========================================================
   FILTER SYSTEM — advanced seperti Sheets
   =========================================================== */

export type FilterCondition =
  | { type: "text-contains"; value: string }
  | { type: "text-equals"; value: string }
  | { type: "text-starts"; value: string }
  | { type: "text-not-equals"; value: string }
  | { type: "number-eq"; value: number }
  | { type: "number-gt"; value: number }
  | { type: "number-lt"; value: number }
  | { type: "number-between"; min: number; max: number }
  | { type: "date-before"; value: Date }
  | { type: "date-after"; value: Date }
  | { type: "date-between"; start: Date; end: Date }
  | { type: "blank" }
  | { type: "not-blank" };

export interface FilterRule {
  columnIndex: number;
  conditions: FilterCondition[];
  enabled: boolean;
}

/* ===========================================================
   VIRTUALIZATION — untuk >20.000 baris
   =========================================================== */
export interface VirtualRange {
  startRow: number;
  endRow: number;
  totalRows: number;
}

export interface VirtualState {
  viewportHeight: number;
  rowHeight: number;
  scrollTop: number;
  visible: VirtualRange;
}

/* ===========================================================
   FORMULA ENGINE — Basic AST
   =========================================================== */

export type FormulaNode =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "cell"; ref: string } // A1, B2
  | { type: "range"; start: string; end: string }
  | { type: "binary"; op: string; left: FormulaNode; right: FormulaNode }
  | { type: "func"; name: string; args: FormulaNode[] };

/* ===========================================================
   HISTORY ENGINE — Undo/Redo (5 steps)
   =========================================================== */

export interface HistoryEntry {
  rows: GridRow[];
  columns: GridColumn[];
  selection: MultiSelection;
}

export interface HistoryStack {
  undo: HistoryEntry[];
  redo: HistoryEntry[];
}

/* ===========================================================
   SPREADSHEET STATE UTAMA (Context)
   =========================================================== */

export interface SpreadsheetState {
  rows: GridRow[];
  columns: GridColumn[];
  selection: MultiSelection;
  clipboard: ClipboardBlock[] | null;
  freeze: FreezeConfig;
  sortRules: SortRule[];
  filterRules: FilterRule[];
  virtual: VirtualState;
  history: HistoryStack;
}

// ==========================================================
// IDIK-App Cathlab Database Types (JARVIS v3.1 Gold-Cyan)
// ==========================================================

// Struktur metadata tabel (hasil fetchTables)
export interface TableInfo {
  name: string;
  count: number;
  updated_at: string;
  status: "✅ Active" | "❌ Error";
}

// Struktur kolom dari schema (hasil RPC / information_schema)
export interface ColumnInfo {
  column_name: string;
  data_type: string;
}

// Data preview (10 baris pertama)
export type SampleRow = Record<string, any>;

// State utama useDatabaseFetch()
export interface DatabaseState {
  tables: TableInfo[];
  columns: ColumnInfo[];
  sample: SampleRow[];
  selectedTable: string | null;
  loadingTables: boolean;
  loadingSchema: boolean;
  connected: boolean;
  lastSync: string;
}

export interface UseDatabaseFetch extends DatabaseState {
  setSelectedTable: (table: string | null) => void;
  fetchTables: () => Promise<void>;
  fetchSchema: (table: string) => Promise<void>;
}

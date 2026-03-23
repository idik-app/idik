// 💾 D:\idik-app\lib\database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Doctor {
  id: string; // uuid
  created_at: string; // timestampz
  nama_dokter: string | null;
  spesialis: string | null;
  nomor_str: string | null;
  nomor_sip: string | null;
  kontak: string | null;
  email: string | null;
  status: boolean;
}

// Tabel tambahan yang dipakai di app
export interface ApiKey {
  id: string;
  name: string;
  permissions: string;
  created_at?: string;
  status?: string;
  token_hash?: string;
  updated_at?: string;
}

export interface SystemLog {
  id?: string;
  timestamp: string;
  module: string;
  level: string;
  message: unknown;
  latency?: unknown;
  issue?: string | null;
}

export interface LogRow {
  id?: string;
  timestamp: string;
  level: string;
  message: string;
}

export interface TindakanRow {
  id: string;
  [key: string]: unknown;
}

export interface MasterDistributorRow {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  nama_pt: string;
  nama_sales: string | null;
  kontak_wa: string | null;
  email: string | null;
  alamat: string | null;
  catatan: string | null;
  is_active: boolean;
}

export interface MasterBarangRow {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  kode: string;
  nama: string;
  jenis: 'OBAT' | 'ALKES';
  kategori: string | null;
  satuan: string | null;
  barcode: string | null;
  distributor_id: string | null;
  harga_pokok: number | null;
  harga_jual: number | null;
  is_active: boolean;
}

export interface InventarisRow {
  id: string;
  created_at: string;
  updated_at: string;
  nama: string;
  kategori: string | null;
  satuan: string | null;
  stok: number | null;
  min_stok: number | null;
  lokasi: string | null;
  master_barang_id?: string | null;
  distributor_id?: string | null;
}

export interface PemakaianRow {
  id: string;
  created_at: string;
  inventaris_id: string;
  jumlah: number;
  tanggal: string;
  keterangan: string | null;
  tindakan_id: string | null;
}

export interface DistributorNotificationSettingsRow {
  distributor_id: string;
  created_at: string | null;
  updated_at: string | null;
  email_recipients: string[] | null;
  realtime_enabled: boolean | null;
  realtime_aggregate_minutes: number | null;
  low_stock_enabled: boolean | null;
  daily_digest_enabled: boolean | null;
  daily_digest_time: string | null;
  weekly_digest_enabled: boolean | null;
  weekly_digest_day: number | null;
  weekly_digest_time: string | null;
}

export interface DistributorEventLogRow {
  id: string;
  created_at: string;
  distributor_id: string;
  event_type: string;
  payload: Json;
  actor: string | null;
  nota_nomor?: string | null;
  penerima_petugas?: string | null;
  /** KATALOG_RETUR: alur ambil / terima barang */
  retur_fisik_status?: string | null;
  /** Nomor SJ / referensi pengiriman retur */
  nota_pengiriman?: string | null;
}

export interface DistributorBarangRow {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  distributor_id: string;
  master_barang_id: string;
  kode_distributor: string | null;
  harga_jual: number | null;
  min_stok: number | null;
  is_active: boolean | null;
  /** Barcode kemasan di level mapping distributor */
  barcode: string | null;
  /** Tipe alkes: STENT, BALLON, WIRE, GUIDING, KATETER */
  kategori: string | null;
  lot: string | null;
  ukuran: string | null;
  /** Kedaluwarsa bulan–tahun (MM-YYYY), contoh 09-2028 */
  ed: string | null;
}

/** Ledger mutasi stok inventaris (Cathlab). */
export interface CathlabKoronarAnnotationRow {
  id: string;
  created_by: string;
  pasien_id: string | null;
  tindakan_id: string | null;
  template_id: string;
  title: string | null;
  payload: Json;
  created_at: string;
  updated_at: string;
}

export interface InventarisStokMutasiRow {
  id: string;
  created_at: string;
  inventaris_id: string;
  tipe: string;
  qty_delta: number;
  stok_setelah: number | null;
  ref_type: string | null;
  ref_id: string | null;
  keterangan: string | null;
  actor: string | null;
}

// Skema Database Utama
export interface Database {
  public: {
    Tables: {
      doctor: {
        Row: Doctor;
        Insert: Omit<Doctor, "id" | "created_at"> & Partial<Pick<Doctor, "id" | "created_at">>;
        Update: Partial<Omit<Doctor, "id" | "created_at">>;
      };
      api_keys: {
        Row: ApiKey;
        Insert: Partial<ApiKey>;
        Update: Partial<ApiKey>;
      };
      system_logs: {
        Row: SystemLog;
        Insert: SystemLog;
        Update: Partial<SystemLog>;
      };
      logs: {
        Row: LogRow;
        Insert: Partial<LogRow>;
        Update: Partial<LogRow>;
      };
      tindakan: {
        Row: TindakanRow;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      master_distributor: {
        Row: MasterDistributorRow;
        Insert: Partial<Omit<MasterDistributorRow, 'id'>> & {
          id?: string;
        };
        Update: Partial<MasterDistributorRow>;
      };
      master_barang: {
        Row: MasterBarangRow;
        Insert: Partial<Omit<MasterBarangRow, 'id'>> & {
          id?: string;
        };
        Update: Partial<MasterBarangRow>;
      };
      inventaris: {
        Row: InventarisRow;
        Insert: Partial<Omit<InventarisRow, "id" | "created_at" | "updated_at">> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<InventarisRow, "id" | "created_at">>;
      };
      pemakaian: {
        Row: PemakaianRow;
        Insert: Partial<Omit<PemakaianRow, "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<PemakaianRow, "id" | "created_at">>;
      };
      distributor_notification_settings: {
        Row: DistributorNotificationSettingsRow;
        Insert: Partial<DistributorNotificationSettingsRow>;
        Update: Partial<DistributorNotificationSettingsRow>;
      };

      distributor_barang: {
        Row: DistributorBarangRow;
        Insert: Partial<DistributorBarangRow>;
        Update: Partial<DistributorBarangRow>;
      };
      distributor_event_log: {
        Row: DistributorEventLogRow;
        Insert: Omit<DistributorEventLogRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<
          Omit<DistributorEventLogRow, "id" | "created_at" | "distributor_id">
        >;
      };
      inventaris_stok_mutasi: {
        Row: InventarisStokMutasiRow;
        Insert: Omit<InventarisStokMutasiRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<InventarisStokMutasiRow>;
      };
      cathlab_koronar_annotation: {
        Row: CathlabKoronarAnnotationRow;
        Insert: Omit<
          CathlabKoronarAnnotationRow,
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<CathlabKoronarAnnotationRow, "id" | "created_by" | "created_at">
        >;
      };
    };
    Views: {
      [key: string]: { Row: Record<string, unknown> };
    };
    Functions: {
      list_tables: { Args: Record<string, never>; Returns: unknown };
      list_columns: { Args: { table_name: string }; Returns: unknown };
      exec_sql: { Args: { query: string }; Returns: unknown };
      apply_inventaris_stok_mutasi: {
        Args: {
          p_inventaris_id: string;
          p_tipe: string;
          p_qty_delta: number;
          p_ref_type?: string | null;
          p_ref_id?: string | null;
          p_keterangan?: string | null;
          p_actor?: string | null;
        };
        Returns: string;
      };
      [key: string]: { Args: Record<string, unknown>; Returns: unknown };
    };
  };
}

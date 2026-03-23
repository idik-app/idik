// app/core/db/idikDexie.ts
import Dexie, { Table } from "dexie";

export interface Pasien {
  id_local: string;
  id_supabase?: string;
  nama: string;
  dokter: string;
  tindakan: string;
  tanggal: string;
  sync_status: "pending" | "synced" | "failed";
  updated_at: string;
}

export class IDIKDexie extends Dexie {
  pasien!: Table<Pasien>;
  log_sync!: Table<{ id: string; status: string; created_at: string }>;
}

export const db = new IDIKDexie("IDIK-LocalDB");
db.version(1).stores({
  pasien: "id_local, id_supabase, sync_status, updated_at",
  log_sync: "id, status, created_at",
});

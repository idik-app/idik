// domain/tindakan.ts
export interface Tindakan {
  ruangan?: string;
  status?: string;
  durasi?: number;
  start_time?: string;
  end_time?: string;
  operator?: string;
  alkes_utama?: string;
  catatan?: string;
}

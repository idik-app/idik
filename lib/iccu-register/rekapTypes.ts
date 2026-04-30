/**
 * Bentuk JSON dari RPC Postgres `iccu_rekap_year_payload`.
 * @see supabase/migrations/*_iccu_rekap_year_payload.sql
 */

export type IccuRekapMonthPayload = {
  month: number;
  section_a: {
    umum: number;
    bpjs_pbi: number;
    npbi: number;
    rjks: number;
    lain: number;
  };
  section_b: {
    meninggal: number;
    meninggal_lt48: number;
    meninggal_gt48: number;
    dirujuk: number;
    pulang_paksa: number;
    pindah_ruangan: number;
    krs: number;
    ventilator: number;
    cvc: number;
    pdt: number;
    dca_ptca: number;
    trombolitik: number;
    tpm: number;
    ppm: number;
    perikardiosintesis: number;
    ablasi: number;
    sum_los_hari: number;
    los_rows: number;
  };
  section_c: {
    note?: string;
    avg_los_hari?: number | null;
  };
  section_d: Record<string, number>;
};

export type IccuRekapYearPayload = {
  year: number;
  /** Baris `iccu_register_entry` yang termasuk tahun & tanggal acuan (filter sama RPC). */
  entry_count_year?: number;
  months: IccuRekapMonthPayload[];
};

export const REKAP_MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

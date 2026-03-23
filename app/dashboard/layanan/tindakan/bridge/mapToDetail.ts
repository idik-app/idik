// ========================================================================
// 📌 mapToDetail.ts — Mapping JOIN 38 Kolom → Modal Detail (5 Section)
// ========================================================================

import { DETAIL_GROUPS } from "./bridge.constants";
import { TindakanJoinResult, TindakanDetailView } from "./mapping.types";

// fallback untuk nilai kosong
const safe = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";
  return value;
};

export function mapToDetail(data: TindakanJoinResult): TindakanDetailView {
  if (!data) {
    return {
      pasien: {},
      tindakan: {},
      mesin: {},
      klinis: {},
      keuangan: {},
    };
  }

  const hasil: TindakanDetailView = {
    pasien: {},
    tindakan: {},
    mesin: {},
    klinis: {},
    keuangan: {},
  };

  // ------------------------------
  // 1) Section: Pasien
  // ------------------------------
  DETAIL_GROUPS.pasien.forEach((key) => {
    hasil.pasien[key] = safe((data as any)[key]);
  });

  // ------------------------------
  // 2) Section: Tindakan
  // ------------------------------
  DETAIL_GROUPS.tindakan.forEach((key) => {
    hasil.tindakan[key] = safe((data as any)[key]);
  });

  // ------------------------------
  // 3) Section: Mesin Cathlab
  // ------------------------------
  DETAIL_GROUPS.mesin.forEach((key) => {
    hasil.mesin[key] = safe((data as any)[key]);
  });

  // ------------------------------
  // 4) Section: Klinis / Perawat
  // ------------------------------
  DETAIL_GROUPS.klinis.forEach((key) => {
    hasil.klinis[key] = safe((data as any)[key]);
  });

  // ------------------------------
  // 5) Section: Keuangan
  // ------------------------------
  DETAIL_GROUPS.keuangan.forEach((key) => {
    hasil.keuangan[key] = safe((data as any)[key]);
  });

  return hasil;
}

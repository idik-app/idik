// ========================================================================
// 📌 mapToEditor.ts — Mapping JOIN → Modal Editor (4 TAB)
// ========================================================================

import { EDITOR_TABS } from "./bridge.constants";
import { TindakanJoinResult, TindakanEditorState } from "./mapping.types";

// Helper untuk mengubah nilai menjadi string & aman
const toStr = (v: any) => {
  if (v === null || v === undefined) return "";
  return String(v);
};

export function mapToEditor(data: TindakanJoinResult): TindakanEditorState {
  if (!data) {
    return {
      info: {} as any,
      mesin: {} as any,
      klinis: {} as any,
      summary: {} as any,
    };
  }

  // Struktur final editor
  const editor: TindakanEditorState = {
    info: {
      tanggal: toStr(data.tanggal),
      waktu: toStr(data.waktu),
      dokter: toStr(data.dokter),
      tindakan: toStr(data.tindakan),
      kategori: toStr(data.kategori),
      severity_level: toStr(data.severity_level),
      status: toStr(data.status),
      ruangan: toStr(data.ruangan),
      kelas_pembiayaan: toStr(data.kelas_pembiayaan),
      pembiayaan: toStr(data.pembiayaan),
      tarif_tindakan: toStr(data.tarif_tindakan),
    },

    mesin: {
      fluoro_time: toStr(data.fluoro_time),
      dose: toStr(data.dose),
      kv: toStr(data.kv),
      ma: toStr(data.ma),
      cath: toStr(data.cath),
    },

    klinis: {
      diagnosa: toStr(data.diagnosa),
      hasil_lab_ppm: toStr(data.hasil_lab_ppm),
      asisten: toStr(data.asisten),
      sirkuler: toStr(data.sirkuler),
      logger: toStr(data.logger),
      lama_perawatan: toStr(data.lama_perawatan),
    },

    summary: {
      krs: toStr(data.krs),
      resume: toStr(data.resume),

      consumable: toStr(data.consumable),
      total: toStr(data.total),
      selisih: toStr(data.selisih),
    },
  };

  return editor;
}

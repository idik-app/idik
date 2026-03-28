import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  WIREFRAME_DRAWER_TABS,
  FIELD_LABELS,
  formatFieldValue,
  getWireframeFieldValue,
} from "../bridge/wireframeDrawerTabs";

const RESUME_SUMMARY_TABS = WIREFRAME_DRAWER_TABS.filter(
  (t) => t.id !== "history",
);

function formatMeta(
  rec: TindakanJoinResult,
  key: "id" | "created_at" | "updated_at",
): string {
  const r = rec as unknown as Record<string, unknown>;
  if (key === "id") {
    const v = rec.id;
    return v != null && String(v).trim() !== "" ? String(v) : "—";
  }
  if (key === "updated_at") {
    const u = getWireframeFieldValue(r, "updated_at");
    const i = getWireframeFieldValue(r, "inserted_at");
    return formatFieldValue("updated_at", u || i);
  }
  return formatFieldValue(key, getWireframeFieldValue(r, key));
}

/**
 * Teks polos ramah WhatsApp: judul *tebal* dengan asterisk, tanpa markdown aneh.
 */
export function buildResumeWhatsAppText(
  displayRecord: TindakanJoinResult,
  riwayatPasienRows: TindakanJoinResult[],
): string {
  const lines: string[] = [];
  const rm = String(displayRecord.no_rm ?? "").trim() || "—";
  const nama = String(displayRecord.nama_pasien ?? "").trim() || "—";
  const kasus = String(displayRecord.tindakan ?? "").trim() || "—";

  lines.push("*RESUME TINDAKAN*");
  lines.push(`No. RM: ${rm}`);
  lines.push(`Nama: ${nama}`);
  lines.push(`Tindakan (kasus ini): ${kasus}`);
  lines.push("");

  for (const def of RESUME_SUMMARY_TABS) {
    lines.push(`*${def.label.toUpperCase()}*`);
    for (const key of def.fields) {
      const raw = getWireframeFieldValue(
        displayRecord as unknown as Record<string, unknown>,
        key,
      );
      const label = FIELD_LABELS[key] ?? key;
      lines.push(`${label}: ${formatFieldValue(key, raw)}`);
    }
    lines.push("");
  }

  lines.push("*METADATA SISTEM*");
  lines.push(`ID kasus: ${formatMeta(displayRecord, "id")}`);
  lines.push(`Dibuat: ${formatMeta(displayRecord, "created_at")}`);
  lines.push(`Diperbarui: ${formatMeta(displayRecord, "updated_at")}`);
  lines.push("");

  lines.push("*RIWAYAT TINDAKAN PASIEN*");
  if (riwayatPasienRows.length === 0) {
    lines.push("(Belum ada baris lain untuk pasien ini di data yang dimuat.)");
  } else {
    const curId = String(displayRecord.id ?? "").trim();
    riwayatPasienRows.forEach((r, idx) => {
      const rid = String(r.id ?? "").trim();
      const isCurrent = rid !== "" && curId !== "" && rid === curId;
      const tgl = formatFieldValue(
        "tanggal_tindakan",
        getWireframeFieldValue(
          r as unknown as Record<string, unknown>,
          "tanggal_tindakan",
        ),
      );
      lines.push(
        `${idx + 1}. ${tgl}${isCurrent ? " *[kasus ini]*" : ""}`,
      );
      lines.push(`   • ${r.tindakan?.trim() || "—"}`);
      lines.push(
        `   • Dr: ${r.dokter?.trim() || "—"} | Ruang: ${r.ruangan?.trim() || "—"} | St: ${r.status?.trim() || "—"}`,
      );
      if (r.kategori?.trim()) {
        lines.push(`   • Kategori: ${r.kategori.trim()}`);
      }
      if (rid) lines.push(`   • ID: ${rid}`);
      lines.push("");
    });
  }

  lines.push("──────────");
  lines.push("_Ringkasan dari modul Tindakan IDIK_");

  return lines.join("\n").trim();
}

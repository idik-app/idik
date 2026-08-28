import type { RuanganOption } from "@/components/ui/ruangan-combobox";
import { formatRuanganLabel } from "@/components/ui/ruangan-combobox";
import { extractCalendarDateKey } from "../utils/tindakanHelpers";

export type RmDateRow = {
  id?: string | null;
  tanggal?: string | null;
  no_rm?: string | null;
  rm?: string | null;
};

/** Ruangan aktif pertama yang nama/kategorinya mengandung "cath". */
export function pickDefaultCathlabRuangan(
  options: RuanganOption[],
): string | null {
  const active = options.filter((r) => r.aktif !== false);
  const cath = active
    .filter((r) => {
      const blob = `${r.nama ?? ""} ${r.kategori ?? ""}`.toLowerCase();
      return blob.includes("cath");
    })
    .sort((a, b) =>
      String(a.nama ?? "").localeCompare(String(b.nama ?? ""), "id"),
    );
  if (!cath.length) return null;
  return formatRuanganLabel(cath[0]);
}

export function hasDuplicateRmOnDate(
  rows: RmDateRow[],
  rm: string,
  tanggalKey: string,
  excludeId?: string,
): boolean {
  const rmNorm = String(rm ?? "").trim();
  if (!rmNorm) return false;
  const tKey =
    extractCalendarDateKey(String(tanggalKey ?? "").trim()) ??
    String(tanggalKey ?? "").trim();
  if (!tKey) return false;

  return rows.some((r) => {
    const id = String(r.id ?? "").trim();
    if (excludeId && id === excludeId) return false;
    const rowRm = String(r.no_rm ?? r.rm ?? "").trim();
    const rowDate =
      extractCalendarDateKey(String(r.tanggal ?? "").trim()) ??
      String(r.tanggal ?? "").trim();
    return rowRm === rmNorm && rowDate === tKey;
  });
}

export function duplicateRmOnDateMessage(rm: string, tanggalKey: string): string {
  const tKey =
    extractCalendarDateKey(String(tanggalKey ?? "").trim()) ??
    String(tanggalKey ?? "").trim();
  return `RM ${rm} sudah ada di tanggal ${tKey}. Tetap tambah sebagai kasus ulang?`;
}

export async function confirmDuplicateRmOnDate(params: {
  rm: string;
  tanggalKey: string;
  showWarning?: (message: string) => void;
}): Promise<boolean> {
  const msg = duplicateRmOnDateMessage(params.rm, params.tanggalKey);
  params.showWarning?.(msg);
  return window.confirm(msg);
}

// components/global/ExportShare/exporters/excelExporter.ts
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export async function exportToExcel(
  type: string,
  data: any[],
  asBlob = false
): Promise<Blob | void> {
  if (!data || data.length === 0) {
    alert("Tidak ada data untuk diekspor!");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  const tanggal = new Date().toISOString().split("T")[0];
  const filename = `IDIK_${type}_${tanggal}.xlsx`;
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  if (asBlob) return blob;
  saveAs(blob, filename);
}

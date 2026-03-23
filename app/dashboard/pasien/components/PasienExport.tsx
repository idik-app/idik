"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { usePasienCrud } from "../hooks/usePasienCrud";
import { useNotification } from "@/app/contexts/NotificationContext";

/**
 * 🧠 PasienExport v3.8
 * Ekspor data pasien ke Excel (.xlsx) dan PDF.
 */

export default function PasienExport() {
  const { patients } = usePasienCrud();
  const { show } = useNotification();
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const exportToExcel = () => {
    if (!patients?.length) {
      show({ type: "warning", message: "Tidak ada data pasien untuk diekspor." });
      return;
    }
    try {
      const worksheet = XLSX.utils.json_to_sheet(patients);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pasien");
      XLSX.writeFile(workbook, "Data_Pasien_IDIK.xlsx");
      show({ type: "success", message: "Excel berhasil diunduh." });
    } catch (err: any) {
      show({ type: "error", message: "Gagal ekspor Excel: " + (err?.message || "Unknown error") });
    }
  };

  const exportToPDF = () => {
    if (!patients?.length) {
      show({ type: "warning", message: "Tidak ada data pasien untuk diekspor." });
      return;
    }
    setExporting("pdf");
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Data Pasien Cathlab IDIK", 14, 16);
      const tableData = patients.map((p: any) => [
        String(p.noRM ?? ""),
        String(p.nama ?? ""),
        String(p.jenisKelamin ?? ""),
        String(p.jenisPembiayaan ?? ""),
        String(p.kelasPerawatan ?? ""),
        String(p.asuransi ?? ""),
        String(p.noHP ?? ""),
      ]);
      autoTable(doc, {
        startY: 24,
        head: [
          ["No. RM", "Nama", "JK", "Pembiayaan", "Kelas", "Asuransi", "No. HP"],
        ],
        body: tableData,
        styles: {
          fillColor: [0, 0, 0],
          textColor: [255, 255, 255],
          lineColor: [60, 255, 255],
          lineWidth: 0.1,
          fontSize: 9,
        },
        headStyles: {
          fillColor: [255, 215, 0],
          textColor: [0, 0, 0],
        },
        alternateRowStyles: { fillColor: [30, 30, 30] },
      });
      doc.save("Data_Pasien_IDIK.pdf");
      show({ type: "success", message: "PDF berhasil diunduh." });
    } catch (err: any) {
      show({ type: "error", message: "Gagal ekspor PDF: " + (err?.message || "Unknown error") });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={exportToExcel}
        className="flex items-center gap-2 bg-gradient-to-r from-cyan-700 to-cyan-500 hover:opacity-90 shadow-md"
      >
        <FileSpreadsheet size={16} /> Excel
      </Button>

      <Button
        onClick={exportToPDF}
        disabled={!!exporting}
        className="flex items-center gap-2 bg-gradient-to-r from-gold to-yellow-400 text-black hover:opacity-90 shadow-md disabled:opacity-70"
      >
        <FileText size={16} /> {exporting === "pdf" ? "Membuat PDF..." : "PDF"}
      </Button>

      <Button
        variant="outline"
        disabled
        className="flex items-center gap-2 border-cyan-500/50 text-cyan-400 cursor-not-allowed"
        title="Coming soon: Export CSV"
      >
        <Download size={16} /> CSV
      </Button>
    </div>
  );
}

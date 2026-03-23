"use client";

import jsPDF from "jspdf";
import "jspdf-autotable";
import { usePasien } from "../contexts/PasienContext";
import { hitungUsia } from "../utils/formatUsia";
import { FileText } from "lucide-react";

export default function ExportReportOfficial() {
  const { patients } = usePasien();

  const handleExportOfficial = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // === HEADER ===
    const logoRSUD = "/logo-rsud.png"; // letakkan di /public
    const logoIDIK = "/logo-idik.png"; // letakkan di /public
    try {
      doc.addImage(logoRSUD, "PNG", 15, 8, 25, 25);
      doc.addImage(logoIDIK, "PNG", 170, 8, 25, 25);
    } catch (err) {
      console.warn("Logo belum tersedia di /public");
    }

    doc.setFontSize(14);
    doc.setTextColor(255, 215, 0);
    doc.text("RUMAH SAKIT UMUM DAERAH dr. MOHAMAD SOEWANDHIE", 105, 18, {
      align: "center",
    });

    doc.setFontSize(11);
    doc.setTextColor(180);
    doc.text(
      "Instalasi Diagnostik & Intervensi Kardiovaskular (IDIK)",
      105,
      24,
      {
        align: "center",
      }
    );

    doc.setDrawColor(255, 215, 0);
    doc.line(15, 30, 195, 30);

    // === TITLE ===
    doc.setFontSize(13);
    doc.setTextColor(255, 215, 0);
    doc.text("LAPORAN DATA PASIEN CATHLAB", 105, 40, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(
      `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`,
      15,
      47
    );

    // === TABLE ===
    const tableColumn = ["No. RM", "Nama", "JK", "Usia", "Alamat", "No. HP"];
    const tableRows = patients.map((p: any) => [
      p.noRM,
      p.nama,
      p.jenisKelamin,
      hitungUsia(p.tanggalLahir).teks,
      p.alamat,
      p.noHP,
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 52,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [0, 255, 255],
        lineWidth: 0.1,
        textColor: [30, 30, 30],
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 215, 0],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      theme: "grid",
    });

    // === SIGNATURE SECTION ===
    let y = (doc as any).lastAutoTable.finalY + 20;
    const tanggal = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`Surabaya, ${tanggal}`, 140, y);

    y += 7;
    doc.text("Kepala Ruang IDIK", 30, y);
    doc.text("Koordinator Cathlab", 140, y);

    y += 30;
    doc.text("(....................................)", 25, y);
    doc.text("(....................................)", 135, y);

    // === FOOTER ===
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "Generated automatically by IDIK-App JARVIS System",
      105,
      pageHeight - 10,
      { align: "center" }
    );

    // === SAVE FILE ===
    const fileName = `Laporan_Pasien_IDIK_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  return (
    <button
      onClick={handleExportOfficial}
      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-gradient-to-r from-emerald-500/90 to-green-400 text-black font-semibold shadow-[0_0_10px_rgba(0,255,128,0.3)] hover:scale-105 transition"
      title="Ekspor PDF Resmi RSUD"
    >
      <FileText size={16} />
      Surat Resmi
    </button>
  );
}

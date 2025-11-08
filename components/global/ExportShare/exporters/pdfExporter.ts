// components/global/ExportShare/exporters/pdfExporter.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToPDF(type: string, data: any[]) {
  if (!data || data.length === 0) {
    alert("Tidak ada data untuk diekspor!");
    return;
  }

  const doc = new jsPDF("p", "pt", "a4");
  const tanggal = new Date().toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Header
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, 600, 60, "F");
  doc.setTextColor(255, 215, 0);
  doc.setFontSize(18);
  doc.text(
    `📄 Biodata ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    40,
    35
  );
  doc.setFontSize(10);
  doc.setTextColor(0, 255, 255);
  doc.text(`Tanggal Ekspor: ${tanggal}`, 420, 35, { align: "right" });

  // Tabel
  const headers = Object.keys(data[0]).map((key) => key.toUpperCase());
  const body = data.map((row) => Object.values(row));

  autoTable(doc, {
    head: [headers],
    body,
    startY: 80,
    styles: {
      fillColor: [0, 0, 0],
      textColor: [0, 255, 255],
      lineColor: [255, 215, 0],
      lineWidth: 0.2,
      fontSize: 8,
      halign: "center",
    },
    headStyles: {
      fillColor: [20, 20, 20],
      textColor: [255, 215, 0],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [10, 10, 10] },
  });

  const filename = `IDIK_${type}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}

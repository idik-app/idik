import { jsPDF } from "jspdf";

type ExportOpts = {
  title?: string;
  /** Opsional; jika tidak diisi, tidak ada teks footer di PDF. */
  disclaimerLines?: string[];
};

/**
 * Gambar PNG (data URL) dari canvas WebGL → PDF landscape A4 + teks footer.
 */
export function exportKoronarPdfFromDataUrl(
  imageDataUrl: string,
  filename: string,
  opts: ExportOpts
): void {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const lines = opts.disclaimerLines ?? [];
  const footerH =
    lines.length === 0 ? 0 : lines.length * 4 + 10;
  const imgAreaH = pageH - margin * 2 - footerH - (opts.title ? 8 : 0);

  let y = margin;
  if (opts.title) {
    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 40);
    pdf.text(opts.title, margin, y + 5);
    y += 10;
  }

  const props = pdf.getImageProperties(imageDataUrl);
  const imgW = pageW - margin * 2;
  const imgH = (props.height * imgW) / props.width;
  const scale = imgH > imgAreaH ? imgAreaH / imgH : 1;
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const xOff = margin + (imgW - drawW) / 2;

  pdf.addImage(imageDataUrl, "PNG", xOff, y, drawW, drawH);

  if (lines.length > 0) {
    pdf.setFontSize(7.5);
    pdf.setTextColor(80, 60, 20);
    let fy = pageH - margin - lines.length * 3.8;
    lines.forEach((line) => {
      pdf.text(line, margin, fy, { maxWidth: pageW - margin * 2 });
      fy += 3.8;
    });
  }

  pdf.save(filename);
}

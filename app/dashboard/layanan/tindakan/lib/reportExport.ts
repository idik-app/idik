/** Batas aman untuk `wa.me/?text=` (browser & WhatsApp). */
export const WHATSAPP_TEXT_MAX_CHARS = 1600;

export function truncateForWhatsApp(text: string, max = WHATSAPP_TEXT_MAX_CHARS): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max - 40);
  return `${head}\n\n… (pesan dipotong — unduh HTML atau cetak dari aplikasi.)`;
}

export function printReportHtml(html: string): void {
  // Gunakan iframe tersembunyi untuk mencetak tanpa memicu popup blocker
  let iframe = document.getElementById("print-frame") as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    // Fallback ke window.open jika iframe gagal (sangat jarang)
    const w = window.open("", "_blank");
    if (!w) {
      window.alert(
        "Gagal membuka jendela cetak. Izinkan popup atau coba lagi.",
      );
      return;
    }
    w.document.write(html);
    w.document.close();
    w.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, 250);
}

export function downloadReportHtml(filename: string, html: string): void {
  const safe = filename.replace(/[^\w.\-]+/g, "_");
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safe.endsWith(".html") ? safe : `${safe}.html`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function openWhatsAppWithText(text: string): void {
  const body = truncateForWhatsApp(text);
  const url = `https://wa.me/?text=${encodeURIComponent(body)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

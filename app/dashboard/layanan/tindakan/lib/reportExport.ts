/** Batas aman untuk `wa.me/?text=` (browser & WhatsApp). */
export const WHATSAPP_TEXT_MAX_CHARS = 1600;

export function truncateForWhatsApp(text: string, max = WHATSAPP_TEXT_MAX_CHARS): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max - 40);
  return `${head}\n\n… (pesan dipotong — unduh HTML atau cetak dari aplikasi.)`;
}

export function printReportHtml(html: string): void {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    window.alert(
      "Popup diblokir. Izinkan popup untuk halaman ini lalu coba cetak lagi.",
    );
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  const runPrint = () => {
    try {
      w.focus();
      w.print();
    } catch {
      /* ignore */
    }
  };
  if (w.document.readyState === "complete") {
    setTimeout(runPrint, 150);
  } else {
    w.addEventListener("load", () => setTimeout(runPrint, 150));
  }
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

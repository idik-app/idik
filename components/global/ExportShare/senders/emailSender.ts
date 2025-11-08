/*
  ✉️ emailSender.ts
  -------------------
  🔹 Mengirim file melalui email (versi dasar pakai mailto link)
  🔹 Di tahap selanjutnya bisa diupgrade ke SMTP / Resend / SendGrid API.
*/

export function sendEmail(link: string, filename: string) {
  try {
    const subject = encodeURIComponent(`Laporan ${filename} dari IDIK-App`);
    const body = encodeURIComponent(
      `Halo,\n\nBerikut link file hasil ekspor dari IDIK-App:\n${link}\n\nTerima kasih.\n- Sistem IDIK`
    );

    const mailto = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank");
  } catch (err) {
    console.error("❌ Gagal membuka mailto link:", err);
  }
}

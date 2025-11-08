export async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(
      phone
    )}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
  }
}

// Format tanggal jadi lokal Indonesia
export function formatTanggal(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// Potong teks untuk cuplikan
export function truncateText(text: string, maxLength: number) {
  if (!text) return ""
  return text.length > maxLength
    ? text.substring(0, maxLength) + "..."
    : text
}

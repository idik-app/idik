export function formatNama(nama: string) {
  if (!nama) return "";
  return nama
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

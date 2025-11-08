/*
  📦 jsonExporter.ts
  -------------------
  🔹 Mengekspor data ke format JSON.
  🔹 Bisa mengembalikan Blob (untuk upload / WA / email)
  🔹 Atau langsung mengunduh file (untuk mode manual)
*/

export async function exportToJSON(
  type: string,
  data: any[],
  returnBlob = false
): Promise<Blob | void> {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    if (returnBlob) return blob;

    const date = new Date().toISOString().split("T")[0];
    const filename = `IDIK_${type}_${date}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("❌ Gagal mengekspor JSON:", err);
  }
}

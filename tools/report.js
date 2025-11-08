// tools/report.js
import fs from "fs";
import path from "path";

const nextDir = path.resolve(".next");
const buildManifestPath = path.join(nextDir, "build-manifest.json");
const startTime = Date.now();

console.log(
  "\x1b[36m%s\x1b[0m",
  "\n📊 ANALYZER V2 – Post Build Summary Reporter\n"
);

try {
  if (!fs.existsSync(buildManifestPath)) {
    console.error(
      "❌ File build-manifest.json tidak ditemukan. Pastikan build telah selesai."
    );
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(buildManifestPath, "utf-8"));
  const pages = manifest.pages || {};

  const pageSizes = Object.entries(pages)
    .map(([route, assets]) => {
      const totalSize = assets.reduce((acc, file) => {
        try {
          const filePath = path.join(nextDir, file);
          const stats = fs.statSync(filePath);
          return acc + stats.size;
        } catch {
          return acc;
        }
      }, 0);
      return { route, size: totalSize };
    })
    .sort((a, b) => b.size - a.size);

  const totalBundle = pageSizes.reduce((a, b) => a + b.size, 0);
  const top10 = pageSizes.slice(0, 10);

  console.log("🏗️  Total halaman terdeteksi:", pageSizes.length);
  console.log(
    "📦  Ukuran total bundle:",
    (totalBundle / 1024 / 1024).toFixed(2),
    "MB\n"
  );

  console.log("🔥 Top 10 Largest Bundles:");
  top10.forEach((p, i) => {
    console.log(
      `${String(i + 1).padStart(2, "0")}. ${p.route.padEnd(25)} ${(
        p.size / 1024
      ).toFixed(1)} KB`
    );
  });

  // --- Recommendations ---
  console.log("\n💡 Rekomendasi Optimasi:");
  const recs = [
    {
      keyword: "framer-motion",
      tip: "Gunakan dynamic import untuk komponen animasi besar.",
    },
    {
      keyword: "react-bootstrap",
      tip: "Import komponen spesifik, hindari import seluruh modul.",
    },
    {
      keyword: "lucide-react",
      tip: "Gunakan ikon hanya yang diperlukan atau buat subset ikon.",
    },
    {
      keyword: "recharts",
      tip: "Pecah grafik besar ke dynamic import agar bundle utama ringan.",
    },
  ];

  const allAssets = Object.values(pages).flat();
  const allContent = allAssets.join(" ");
  recs.forEach((r) => {
    if (allContent.includes(r.keyword)) console.log("⚠️ ", r.tip);
  });

  console.log(
    "\n✅ Analisis selesai dalam",
    ((Date.now() - startTime) / 1000).toFixed(2),
    "detik.\n"
  );
  console.log(
    "\x1b[32m%s\x1b[0m",
    "✨ JARVIS Analyzer v2 aktif — laporan bundle siap ditinjau.\n"
  );
} catch (err) {
  console.error("❌ Gagal membaca laporan bundle:", err.message);
  process.exit(1);
}

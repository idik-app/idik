// tools/check-config-format.js
import fs from "fs";
import path from "path";

const root = process.cwd();
const excludeDirs = ["node_modules", ".next", ".git", "dist"];
const targets = [];

console.log(
  "\x1b[36m%s\x1b[0m",
  "\n🔍 JARVIS Analyzer v3 – Config Format Scanner\n"
);

function scanDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item)) scanDir(fullPath);
    } else if (item.endsWith(".js")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (/module\.exports|require\(/.test(content)) {
        targets.push(fullPath);
      }
    }
  }
}

scanDir(root);

if (targets.length === 0) {
  console.log("✅ Semua file .js kamu sudah berformat ESM (import/export).");
  console.log(
    "\x1b[32m%s\x1b[0m",
    "Tidak ada module.exports atau require() yang terdeteksi.\n"
  );
} else {
  console.log(
    "⚠️  Ditemukan file dengan sintaks CommonJS yang berpotensi konflik:\n"
  );
  targets.forEach((t, i) => {
    console.log(
      `${String(i + 1).padStart(2, "0")}. ${t.replace(root + "\\", "")}`
    );
  });

  console.log("\n💡 Saran otomatis:");
  console.log(
    "• Ubah ekstensi file di atas menjadi .cjs  (misalnya: postcss.config.cjs)"
  );
  console.log("• Atau ubah sintaks ke ESM:");
  console.log("   module.exports → export default");
  console.log("   require('x') → import x from 'x'\n");

  console.log(
    "\x1b[33m%s\x1b[0m",
    "🧩 Tips: Jalankan kembali `npm run report` setelah perbaikan.\n"
  );
}

console.log("✨ Pemeriksaan selesai.\n");

// tools/fix-config-format.js
import fs from "fs";
import path from "path";

const root = process.cwd();
const excludeDirs = ["node_modules", ".next", ".git", "dist", "backup-configs"];
const backupDir = path.join(root, "backup-configs");
const targets = [];

console.log(
  "\x1b[36m%s\x1b[0m",
  "\n🛠️  JARVIS Analyzer v4 – Auto-Fix Config Format\n"
);

// Buat folder backup jika belum ada
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
  console.log("📁 Folder backup-configs dibuat.\n");
}

// Fungsi scan file .js
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
  console.log("✅ Semua file konfigurasi sudah kompatibel dengan ESM.");
  process.exit(0);
}

console.log(`⚙️  Ditemukan ${targets.length} file dengan sintaks CommonJS:\n`);

// Proses setiap file
targets.forEach((file, i) => {
  const newFile = file.replace(/\.js$/, ".cjs");
  const backupFile = path.join(backupDir, path.basename(file));

  try {
    fs.copyFileSync(file, backupFile); // Backup
    fs.renameSync(file, newFile); // Ubah ekstensi
    console.log(
      `\x1b[32m✔️  ${i + 1}. ${file} → ${path.basename(newFile)} (fixed)\x1b[0m`
    );
  } catch (err) {
    console.log(`\x1b[31m❌  Gagal memproses ${file}: ${err.message}\x1b[0m`);
  }
});

console.log("\n💾 Semua file lama disalin ke folder /backup-configs/");
console.log("🧩 Jalankan kembali: npm run report");
console.log(
  "\x1b[33m%s\x1b[0m",
  "\n✨ Auto-Fix selesai. Sistem konfigurasi kamu sekarang stabil.\n"
);

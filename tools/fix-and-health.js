// tools/fix-and-health.js
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const root = process.cwd();
const backupDir = path.join(root, "backup-configs");
const excludeDirs = ["node_modules", ".next", ".git", "dist", "backup-configs"];
const targets = [];

console.log(
  "\x1b[36m%s\x1b[0m",
  "\n🧠 JARVIS Analyzer v5 – Auto-Fix + Build Health Check\n"
);

// === 1. AUTO-FIX STAGE ===
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

function scanDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item)) scanDir(fullPath);
    } else if (item.endsWith(".js")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (/module\.exports|require\(/.test(content)) targets.push(fullPath);
    }
  }
}

scanDir(root);

if (targets.length === 0) {
  console.log(
    "✅ Tidak ada file config bermasalah. Langsung lanjut ke build check.\n"
  );
} else {
  console.log(
    `⚙️  Ditemukan ${targets.length} file CommonJS, memperbaiki...\n`
  );
  targets.forEach((file, i) => {
    const newFile = file.replace(/\.js$/, ".cjs");
    const backupFile = path.join(backupDir, path.basename(file));
    try {
      fs.copyFileSync(file, backupFile);
      fs.renameSync(file, newFile);
      console.log(
        `\x1b[32m✔️  ${i + 1}. ${file} → ${path.basename(
          newFile
        )} (fixed)\x1b[0m`
      );
    } catch (err) {
      console.log(`\x1b[31m❌  Gagal memproses ${file}: ${err.message}\x1b[0m`);
    }
  });
  console.log("\n💾 Semua file lama dibackup di /backup-configs/\n");
}

// === 2. BUILD HEALTH CHECK STAGE ===
console.log("\x1b[34m%s\x1b[0m", "🏗️  Menjalankan build analyzer cepat...\n");
const start = Date.now();

try {
  const output = execSync(
    "cross-env ANALYZE=true SKIP_OPTIMIZATION=1 next build --turbopack",
    {
      cwd: root,
      stdio: "pipe",
      encoding: "utf-8",
    }
  );

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log("\x1b[32m%s\x1b[0m", "\n✅ Build selesai tanpa crash.\n");
  console.log("⏱️  Durasi build:", duration, "detik\n");

  // Quick summary
  const lines = output
    .split("\n")
    .filter((l) => l.includes("✓") || l.includes("Turbopack build"));
  console.log(lines.join("\n"));

  // === 3. Size & Health Summary ===
  console.log("\n📊 Mengevaluasi ukuran bundle...");
  const manifestPath = path.join(root, ".next", "build-manifest.json");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const pages = manifest.pages || {};
    const totalSize = Object.values(pages)
      .flat()
      .reduce((sum, f) => {
        try {
          return sum + fs.statSync(path.join(root, ".next", f)).size;
        } catch {
          return sum;
        }
      }, 0);
    console.log(
      "📦 Total bundle:",
      (totalSize / 1024 / 1024).toFixed(2),
      "MB\n"
    );
  } else {
    console.log("⚠️  Tidak menemukan build-manifest.json\n");
  }

  console.log(
    "\x1b[36m%s\x1b[0m",
    "✨ JARVIS Analyzer v5 selesai — sistem stabil dan optimal.\n"
  );
} catch (err) {
  console.log("\x1b[31m%s\x1b[0m", "\n❌ Build gagal. Pesan error singkat:\n");
  console.log(err.stdout || err.message);
  console.log(
    "\x1b[33m%s\x1b[0m",
    "\n💡 Jalankan `npm run analyze:fast` manual untuk melihat detail.\n"
  );
}

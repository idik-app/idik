// tools/tailwind-doctor.js
import fs from "fs";
import path from "path";

const root = process.cwd();
const cssPath = path.join(root, "app", "globals.css");
const issues = [];
const suggestions = [];

const color = (c) =>
  ({
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  }[c]);

console.log(
  color("cyan")("\n🧠 JARVIS Analyzer v8.3 – Smart Tailwind Doctor\n")
);

// --- 1. Pastikan globals.css ada ---
if (!fs.existsSync(cssPath)) {
  console.log(color("red")("❌ File app/globals.css tidak ditemukan.\n"));
  process.exit(1);
}

const lines = fs.readFileSync(cssPath, "utf8").split("\n");

// --- 2. Analisis baris demi baris ---
lines.forEach((line, idx) => {
  const n = idx + 1;
  const trimmed = line.trim();

  // Cari kesalahan umum @apply
  if (/@apply/.test(trimmed)) {
    if (/:/.test(trimmed.split("@apply")[1])) {
      issues.push(
        `L${n}: Gunakan modifier (seperti selection:, hover:, focus:) di luar @apply.`
      );
      suggestions.push(
        "→ Pindahkan ke selector manual seperti `::selection { ... }`"
      );
    }
  }

  // Direktif Tailwind wajib
  if (n === 1 && !lines.some((l) => l.includes("@tailwind base"))) {
    issues.push(
      "⚠️  File ini tampaknya belum memuat @tailwind base/components/utilities."
    );
  }

  // Deteksi utilitas tidak dikenal umum (typo class)
  if (/rounded-22xl|text-colour|bg-gren/.test(trimmed)) {
    issues.push(`L${n}: Ada kemungkinan typo di class: ${trimmed}`);
  }
});

// --- 3. Ringkasan hasil ---
if (issues.length === 0) {
  console.log(
    color("green")("✅ Tidak ditemukan kesalahan sintaks Tailwind.\n")
  );
  process.exit(0);
}

console.log(
  color("yellow")(`⚠️  Ditemukan ${issues.length} potensi masalah:\n`)
);
issues.forEach((msg) => console.log(color("red")(" - " + msg)));

if (suggestions.length) {
  console.log(color("cyan")("\n💡 Saran Perbaikan:\n"));
  suggestions.forEach((s) => console.log("   " + s));
}

console.log(
  color("yellow")(
    "\n💾 Setelah perbaikan, jalankan kembali `npm run analyze:fast`\n"
  )
);

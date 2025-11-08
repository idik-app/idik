// tools/check-tailwind.js
import fs from "fs";
import path from "path";

const root = process.cwd();
let issues = [];

console.log(
  "\x1b[36m%s\x1b[0m",
  "\n🧠 JARVIS Analyzer v8.1 – Tailwind Integrity Guard\n"
);

// --- 1. Check tailwind.config.cjs ---
const twPath = path.join(root, "tailwind.config.cjs");
if (!fs.existsSync(twPath)) {
  issues.push("❌ File `tailwind.config.cjs` tidak ditemukan di root project.");
} else {
  const twData = fs.readFileSync(twPath, "utf8");
  if (!twData.includes("content:"))
    issues.push("⚠️  tailwind.config.cjs tidak berisi properti `content`.");
  if (!twData.includes("module.exports"))
    issues.push(
      "⚠️  tailwind.config.cjs belum menggunakan CommonJS (module.exports)."
    );
}

// --- 2. Check postcss.config.cjs ---
const postPath = path.join(root, "postcss.config.cjs");
if (!fs.existsSync(postPath)) {
  issues.push("❌ File `postcss.config.cjs` tidak ditemukan di root project.");
} else {
  const postData = fs.readFileSync(postPath, "utf8");
  if (!postData.includes("tailwindcss"))
    issues.push("⚠️  postcss.config.cjs belum memuat plugin TailwindCSS.");
  if (!postData.includes("autoprefixer"))
    issues.push("⚠️  postcss.config.cjs belum memuat plugin autoprefixer.");
}

// --- 3. Check globals.css ---
const cssPath = path.join(root, "app", "globals.css");
if (!fs.existsSync(cssPath)) {
  issues.push("❌ File `app/globals.css` tidak ditemukan.");
} else {
  const cssData = fs.readFileSync(cssPath, "utf8");
  const mustContain = [
    "@tailwind base",
    "@tailwind components",
    "@tailwind utilities",
  ];
  mustContain.forEach((rule) => {
    if (!cssData.includes(rule))
      issues.push(`⚠️  globals.css tidak berisi directive ${rule}`);
  });
}

// --- 4. Check layout import ---
const layoutPath = path.join(root, "app", "layout.tsx");
if (!fs.existsSync(layoutPath)) {
  issues.push(
    "⚠️  File `app/layout.tsx` tidak ditemukan (pastikan CSS diimpor di root layout)."
  );
} else {
  const layoutData = fs.readFileSync(layoutPath, "utf8");
  if (!layoutData.includes('import "./globals.css"'))
    issues.push("⚠️  globals.css belum diimport di layout.tsx.");
}

// --- 5. Check node modules & versions ---
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json")));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!deps.tailwindcss) issues.push("❌ TailwindCSS belum terpasang.");
  if (!deps.postcss) issues.push("❌ PostCSS belum terpasang.");
  if (!deps.autoprefixer) issues.push("❌ Autoprefixer belum terpasang.");
} catch {
  issues.push("⚠️  Tidak dapat membaca package.json.");
}

// --- Summary ---
if (issues.length === 0) {
  console.log(
    "\x1b[32m%s\x1b[0m",
    "✅ Semua konfigurasi Tailwind lengkap dan valid!\n"
  );
} else {
  console.log(
    "\x1b[33m%s\x1b[0m",
    `⚠️ Ditemukan ${issues.length} potensi masalah:\n`
  );
  issues.forEach((msg, i) => console.log(`${i + 1}. ${msg}`));
  console.log("\n💡 Perbaiki item di atas sebelum menjalankan build.\n");
}

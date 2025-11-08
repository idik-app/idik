/**
 * ==========================================================
 * IDIK-App JARVIS Mode – ERD Auto-Sync Script
 * ==========================================================
 * Menyalin isi docs/ERD_Cathlab_IDIKApp.md
 * ke bagian "## 📊 Database Schema" di README.md
 * ==========================================================
 */

import fs from "fs";
import path from "path";

const rootDir = path.resolve(process.cwd());
const readmePath = path.join(rootDir, "README.md");
const erdPath = path.join(rootDir, "docs", "ERD_Cathlab_IDIKApp.md");

if (!fs.existsSync(erdPath)) {
  console.error("❌ File ERD tidak ditemukan di docs/ERD_Cathlab_IDIKApp.md");
  process.exit(1);
}

// Baca file ERD dan README
const erdContent = fs.readFileSync(erdPath, "utf8");
let readmeContent = fs.existsSync(readmePath)
  ? fs.readFileSync(readmePath, "utf8")
  : "";

// Tambahkan atau ganti section Database Schema di README
const startTag = "## 📊 Database Schema";
const endTag = "## 🧠"; // penanda bagian berikutnya (opsional)

const newSection = `${startTag}\n\n${erdContent.trim()}\n`;

if (readmeContent.includes(startTag)) {
  const regex = new RegExp(`${startTag}[\\s\\S]*?(?=${endTag}|$)`, "m");
  readmeContent = readmeContent.replace(regex, newSection);
} else {
  readmeContent += `\n\n${newSection}`;
}

// Simpan perubahan
fs.writeFileSync(readmePath, readmeContent.trimEnd() + "\n");
console.log("✅ ERD berhasil disalin ke README.md");

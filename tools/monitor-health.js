// tools/monitor-health.js
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import fetch from "node-fetch";

const root = process.cwd();
const logFile = path.join(root, "build-health.log");
const start = Date.now();

console.log(
  "\x1b[36m%s\x1b[0m",
  "\n📡 JARVIS Analyzer v6 – Continuous Health Monitor\n"
);

// === 1. Jalankan heal:build secara otomatis ===
try {
  console.log("🧠 Menjalankan auto-heal build check...\n");
  const output = execSync("npm run heal:build", { encoding: "utf-8" });
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  fs.writeFileSync(logFile, output, "utf-8");
  console.log("📝 Laporan tersimpan di build-health.log");

  // === 2. Ringkasan singkat ===
  const lines = output
    .split("\n")
    .filter((l) =>
      l.match(/(Total bundle|Durasi build|Build selesai|Gagal|fixed)/)
    );
  const summary = [
    `📅 ${new Date().toLocaleString()}`,
    `⏱️  Durasi: ${duration} detik`,
    ...lines,
  ].join("\n");

  console.log("\n📊 Ringkasan Build:\n", summary, "\n");

  // === 3. Kirim notifikasi ===
  const SEND_MODE = process.env.NOTIFY_MODE || "none"; // "whatsapp" | "email"
  if (SEND_MODE === "whatsapp") await sendWhatsApp(summary);
  if (SEND_MODE === "email") await sendEmail(summary);
} catch (err) {
  console.error("❌ Gagal menjalankan auto-heal:", err.message);
}

// === Kirim via WhatsApp (menggunakan API pribadi / Fonnte / CallMeBot) ===
async function sendWhatsApp(message) {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_TOKEN;
  const target = process.env.WHATSAPP_TARGET;

  if (!apiUrl || !token || !target) {
    console.log("⚠️  WhatsApp env belum dikonfigurasi.");
    return;
  }

  try {
    await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ target, message }),
    });
    console.log("✅ Notifikasi WhatsApp terkirim ke", target);
  } catch (err) {
    console.log("❌ Gagal kirim WhatsApp:", err.message);
  }
}

// === Kirim via Email (SMTP) ===
async function sendEmail(message) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"JARVIS Build Monitor" <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: "📊 IDIK-App Build Health Report",
      text: message,
    });
    console.log("✅ Email notifikasi terkirim ke", process.env.NOTIFY_EMAIL);
  } catch (err) {
    console.log("❌ Gagal kirim email:", err.message);
  }
}

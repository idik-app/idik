#!/usr/bin/env node
/**
 * Laporkan ada/tidaknya variabel auth penting tanpa mencetak nilai rahasia.
 * Memuat .env lalu .env.local (override) dari root proyek.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let loadedAnyEnv = false;
for (const name of [".env", ".env.local"]) {
  const p = path.join(root, name);
  if (fs.existsSync(p)) {
    loadedAnyEnv = true;
    dotenv.config({
      path: p,
      override: name === ".env.local",
      quiet: true,
    });
  }
}

const nodeEnv = process.env.NODE_ENV || "development";
if (!loadedAnyEnv) {
  console.log(
    "  (info) Belum ada .env / .env.local — salin .env.example ke .env.local lalu isi.\n"
  );
}
const strictProd = process.argv.includes("--strict-prod");

/** @param {string | undefined} v */
function present(v) {
  return typeof v === "string" && v.trim().length > 0;
}

const checks = [
  {
    key: "JWT_SECRET",
    ok: present(process.env.JWT_SECRET),
    note: present(process.env.JWT_SECRET)
      ? nodeEnv === "production"
        ? "wajib; sudah ada"
        : "ter-set — samakan nilai di production deploy"
      : nodeEnv === "production"
        ? "wajib di production"
        : "kosong → dev memakai fallback dev-secret",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    ok: present(process.env.NEXT_PUBLIC_SUPABASE_URL),
    note: "untuk login via app_users",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY",
    ok:
      present(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
      present(process.env.SUPABASE_SERVICE_KEY),
    note: "wajib untuk login (baca app_users)",
  },
];

console.log(`IDIK-App — cek env auth (NODE_ENV=${nodeEnv})\n`);

let exitCode = 0;

for (const { key, ok, note } of checks) {
  const status = ok ? "ADA" : "TIDAK ADA";
  const line = `  ${ok ? "✓" : "✗"} ${key}: ${status}${note ? ` — ${note}` : ""}`;
  console.log(line);
  if (!ok && key.startsWith("JWT_SECRET") && nodeEnv === "production") {
    exitCode = 1;
  }
}

if (nodeEnv !== "production" && !present(process.env.JWT_SECRET)) {
  console.log(
    "\n  (info) Untuk perilaku sama seperti production, set JWT_SECRET di .env.local."
  );
}

if (
  strictProd &&
  (!present(process.env.JWT_SECRET) ||
    !present(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    (!present(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      !present(process.env.SUPABASE_SERVICE_KEY)))
) {
  console.log(
    "\n  --strict-prod: JWT_SECRET + Supabase URL + service role harus semua ADA."
  );
  exitCode = 1;
}

if (exitCode !== 0) {
  console.log("\n  Lihat docs/AUTH-DB.md §0.\n");
}

process.exit(exitCode);

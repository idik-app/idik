// tools/build-guardian.js
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = process.cwd();
const color = (c) =>
  ({
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  }[c]);

console.log(
  color("cyan")("\n🛡️  JARVIS Analyzer v8.4 – Build Guardian Mode\n")
);

// =============
// Step 1. Verifikasi next.config.ts
// =============
const nextConfig = path.join(root, "next.config.ts");
if (fs.existsSync(nextConfig)) {
  const data = fs.readFileSync(nextConfig, "utf8");
  if (!data.includes("postcss-loader")) {
    console.log(
      color("yellow")(
        "⚙️  Menambahkan konfigurasi postcss-loader ke next.config.ts...\n"
      )
    );
    const insert = `
experimental: {
  turbo: {
    rules: {
      "*.css": { loaders: ["postcss-loader"] },
    },
  },
},`;

    let fixed = data;
    if (fixed.includes("const nextConfig")) {
      fixed = fixed.replace(
        /const nextConfig\s*[:=][\s\S]*?=\s*{[\s\S]*?}/m,
        (match) => match.replace("{", "{\n" + insert)
      );
      fs.writeFileSync(nextConfig, fixed);
      console.log(color("green")("✅ postcss-loader injection selesai.\n"));
    } else {
      console.log(
        color("red")(
          "❌ Tidak dapat menemukan struktur nextConfig di next.config.ts."
        )
      );
    }
  } else {
    console.log(
      color("green")("✅ next.config.ts sudah memuat postcss-loader.\n")
    );
  }
} else {
  console.log(color("red")("❌ File next.config.ts tidak ditemukan."));
}

// =============
// Step 2. Jalankan Heal Tailwind
// =============
try {
  console.log(color("cyan")("🔧 Menjalankan auto-heal Tailwind...\n"));
  execSync("node tools/heal-tailwind.js", { stdio: "inherit" });
} catch {
  console.log(color("red")("❌ Gagal menjalankan heal-tailwind.js"));
}

// =============
// Step 3. Jalankan Doctor Tailwind
// =============
try {
  console.log(color("cyan")("\n🩺 Menjalankan Tailwind Doctor...\n"));
  execSync("node tools/tailwind-doctor.js", { stdio: "inherit" });
} catch {
  console.log(color("red")("❌ Doctor mendeteksi masalah pada Tailwind.\n"));
}

// =============
// Step 4. Build Turbopack (Analyze Fast)
// =============
try {
  console.log(color("cyan")("\n🚀 Menjalankan build Turbopack...\n"));
  execSync("npm run analyze:fast", { stdio: "inherit" });
  console.log(color("green")("\n✅ Build Guardian selesai tanpa error!\n"));
} catch {
  console.log(
    color("red")("\n❌ Build Guardian mendeteksi error pada tahap Turbopack.\n")
  );
  console.log(
    color("yellow")(
      "💡 Periksa output di atas untuk memperbaiki konfigurasi.\n"
    )
  );
}

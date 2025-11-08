// tools/heal-tailwind.js
import fs from "fs";
import path from "path";

const root = process.cwd();
const fixes = [];
const logs = [];
const color = (c) =>
  ({
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  }[c]);

console.log(
  color("cyan")("🧠 JARVIS Analyzer v8.2 – Auto-Heal Tailwind Config\n")
);

// Helper write safely
function writeIfMissing(file, content) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, content.trim() + "\n", "utf8");
    fixes.push(`✅ File baru dibuat: ${path.basename(file)}`);
  }
}

// --- 1. tailwind.config.cjs ---
const twPath = path.join(root, "tailwind.config.cjs");
if (!fs.existsSync(twPath)) {
  writeIfMissing(
    twPath,
    `
    /** @type {import('tailwindcss').Config} */
    module.exports = {
      darkMode: ["class"],
      content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
      ],
      theme: { extend: {} },
      plugins: [],
    };
    `
  );
} else {
  const data = fs.readFileSync(twPath, "utf8");
  if (!data.includes("content:")) {
    const fixed = data.replace(
      "theme:",
      `content: ["./app/**/*.{js,ts,jsx,tsx}"],\n  theme:`
    );
    fs.writeFileSync(twPath, fixed);
    fixes.push("⚙️  Menambahkan properti content: di tailwind.config.cjs");
  }
}

// --- 2. postcss.config.cjs ---
const postPath = path.join(root, "postcss.config.cjs");
writeIfMissing(
  postPath,
  `
  module.exports = {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  };
  `
);

// --- 3. globals.css ---
const cssPath = path.join(root, "app", "globals.css");
if (!fs.existsSync(cssPath)) {
  fs.mkdirSync(path.dirname(cssPath), { recursive: true });
  writeIfMissing(
    cssPath,
    `
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    `
  );
} else {
  const data = fs.readFileSync(cssPath, "utf8");
  const required = [
    "@tailwind base",
    "@tailwind components",
    "@tailwind utilities",
  ];
  required.forEach((r) => {
    if (!data.includes(r)) {
      fs.appendFileSync(cssPath, `\n${r}`);
      fixes.push(`⚙️  Menambahkan ${r} ke globals.css`);
    }
  });
}

// --- 4. layout.tsx ---
const layoutPath = path.join(root, "app", "layout.tsx");
if (fs.existsSync(layoutPath)) {
  let layoutData = fs.readFileSync(layoutPath, "utf8");
  if (!layoutData.includes('import "./globals.css"')) {
    const fixed = `import "./globals.css";\n${layoutData}`;
    fs.writeFileSync(layoutPath, fixed);
    fixes.push("⚙️  Menambahkan import './globals.css' di layout.tsx");
  }
} else {
  fixes.push(
    "⚠️  Tidak menemukan layout.tsx – pastikan file layout utama ada di /app."
  );
}

// --- 5. Dependencies check ---
const pkgPath = path.join(root, "package.json");
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const requiredDeps = ["tailwindcss", "postcss", "autoprefixer"];
  const missing = requiredDeps.filter((d) => !deps[d]);
  if (missing.length) {
    console.log(
      color("yellow")(`⚙️  Menginstal dependensi hilang: ${missing.join(", ")}`)
    );
    const { execSync } = await import("child_process");
    execSync(`npm install -D ${missing.join(" ")}`, { stdio: "inherit" });
    fixes.push(`📦 Dependensi baru diinstal: ${missing.join(", ")}`);
  }
}

// --- Summary ---
console.log("\n🔍 Pemeriksaan selesai.\n");
if (fixes.length === 0) {
  console.log(
    color("green")("✅ Semua file Tailwind sudah lengkap dan sehat.\n")
  );
} else {
  fixes.forEach((f) => console.log(color("yellow")(f)));
  console.log(
    color("green")("\n✨ Perbaikan otomatis selesai! Siap menjalankan build.\n")
  );
}

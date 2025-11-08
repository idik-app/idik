/** ==========================================
 🧠 JARVIS HYBRID AUTO-CONFIG v3.3
 Smart switch between DEV and PROD configs
 With graceful fallback & colorful logging
 ========================================== **/

import { existsSync } from "fs";
import path from "path";
import chalk from "chalk";

// 🗂 Path helper
const root = process.cwd();
const devConfigPath = path.join(root, "next.config.dev.mjs");
const prodConfigPath = path.join(root, "next.config.mjs");

// 🧭 Mode detection
const isDev = process.env.NODE_ENV !== "production";
const activePath =
  isDev && existsSync(devConfigPath) ? devConfigPath : prodConfigPath;

// 🪄 Environment flag for external use
process.env.JARVIS_MODE = isDev ? "DEV" : "PROD";

// 🎨 Terminal output with style
const logPrefix = chalk.cyan.bold("🧩 JARVIS CONFIG MODE:");
const logStatus = isDev
  ? chalk.yellow("DEV (next.config.dev.mjs)")
  : chalk.green("PRODUCTION (next.config.mjs)");

console.log(`${logPrefix} ${logStatus}`);

// ⚙️ Load configuration dynamically
let config;
try {
  if (!existsSync(activePath)) {
    console.warn(
      chalk.redBright(
        `⚠️ Config file not found at ${activePath}. Using default fallback.`
      )
    );
    config = { reactStrictMode: true };
  } else {
    config = (await import(activePath)).default;
  }
} catch (err) {
  console.error(chalk.red(`❌ Failed to load config: ${err.message}`));
  config = { reactStrictMode: true };
}

// 🚀 Export the active configuration
export default config;

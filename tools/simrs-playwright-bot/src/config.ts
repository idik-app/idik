import { config as loadDotenv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BOT_ROOT = path.resolve(__dirname, "..");

loadDotenv({ path: path.join(BOT_ROOT, ".env") });

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

function envBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  return !["0", "false", "no", "off"].includes(v.toLowerCase());
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  simrsGetPasienUrl: env(
    "SIMRS_GET_PASIEN_URL",
    "http://10.250.10.107/apibdrs/apibdrs/getPasien",
  ).replace(/\/$/, ""),
  simrsWebUrl: env("SIMRS_WEB_URL", "http://10.255.200.252/SIMRS/"),
  simrsWebUser: env("SIMRS_WEB_USER"),
  simrsWebPass: env("SIMRS_WEB_PASS"),
  simrsMockPath: env("SIMRS_GET_PASIEN_MOCK"),
  idikBaseUrl: env("IDIK_BASE_URL", "http://localhost:3000").replace(/\/$/, ""),
  idikUser: env("IDIK_USER"),
  idikPass: env("IDIK_PASS"),
  /** Shared secret for claim/patch job queue on idik API. */
  agentToken: env("SIMRS_BOT_AGENT_TOKEN"),
  agentPollMs: envInt("SIMRS_BOT_AGENT_POLL_MS", 5000),
  agentId: env("SIMRS_BOT_AGENT_ID", "default"),
  agentRsId: env("SIMRS_BOT_RS_ID", "default"),
  headless: envBool("HEADLESS", true),
  defaultJenisPembiayaan: env("IDIK_DEFAULT_JENIS_PEMBIAYAAN", "Umum"),
  defaultKelasPerawatan: env("IDIK_DEFAULT_KELAS_PERAWATAN", "Kelas 3"),
  onExisting: (env("IDIK_ON_EXISTING", "update").toLowerCase() === "skip"
    ? "skip"
    : "update") as "skip" | "update",
  botStatusEnabled: envBool("IDIK_BOT_STATUS", true),
  exploreClickDelayMs: envInt("EXPLORE_CLICK_DELAY_MS", 500),
  exploreMaxDepth: envInt("EXPLORE_MAX_DEPTH", 12),
  exploreDangerousExtra: env("EXPLORE_DANGEROUS_EXTRA")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  artifactsDir: path.join(BOT_ROOT, "artifacts"),
  checkpointDir: path.join(BOT_ROOT, ".checkpoint"),
};

export function ensureDirs() {
  for (const d of [config.artifactsDir, config.checkpointDir]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

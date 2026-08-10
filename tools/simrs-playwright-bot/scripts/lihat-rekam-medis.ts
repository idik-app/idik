#!/usr/bin/env tsx
import { runLihatRekamMedis } from "../src/workflows/lihat-rekam-medis.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0) return process.argv[i + 1];
  return undefined;
}

const holdRaw = arg("--hold");
const holdParsed = holdRaw != null ? Number(holdRaw) : undefined;
const holdMs =
  holdParsed != null && Number.isFinite(holdParsed) ? holdParsed : undefined;

const openIdik = !process.argv.includes("--no-idik");
const runAgentPoll = !process.argv.includes("--no-agent");
/** Opt-in: buka SIMRS Rekam Medis di awal (default off — Suruh bot membuka SIMRS). */
const openSimrs = process.argv.includes("--simrs");

try {
  // Default: IDIK Tindakan + agen. Flags: --simrs --no-idik --no-agent --hold N
  await runLihatRekamMedis({ holdMs, openIdik, runAgentPoll, openSimrs });
} catch (e) {
  console.error(e);
  process.exit(1);
}

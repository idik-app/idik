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

try {
  // Without --hold: wait for Enter (human watch). With --hold N: timer then close.
  await runLihatRekamMedis({ holdMs });
} catch (e) {
  console.error(e);
  process.exit(1);
}

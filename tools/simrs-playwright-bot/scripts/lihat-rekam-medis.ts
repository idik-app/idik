#!/usr/bin/env tsx
import { runLihatRekamMedis } from "../src/workflows/lihat-rekam-medis.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0) return process.argv[i + 1];
  return undefined;
}

const holdRaw = arg("--hold");
const holdMs = holdRaw ? Number(holdRaw) : undefined;

try {
  await runLihatRekamMedis({
    holdMs: Number.isFinite(holdMs) ? holdMs : undefined,
  });
} catch (e) {
  console.error(e);
  process.exit(1);
}

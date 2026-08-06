#!/usr/bin/env tsx
import { runFillEmpty } from "../src/workflows/fill-empty.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0) return process.argv[i + 1];
  return undefined;
}

const write = process.argv.includes("--write");
const limit = arg("--limit") ? Number(arg("--limit")) : 20;

await runFillEmpty({ dryRun: !write, limit });

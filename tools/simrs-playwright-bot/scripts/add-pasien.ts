#!/usr/bin/env tsx
import { runAddPasien } from "../src/workflows/add-pasien.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0) return process.argv[i + 1];
  const pref = process.argv.find((a) => a.startsWith(`${name}=`));
  return pref?.slice(name.length + 1);
}

const norm = arg("--norm") || process.argv[2];
if (!norm || norm.startsWith("-")) {
  console.error(
    "Usage: npm run add-pasien -- --norm 929331 [--write] [--ui] [--skip-existing] [--skip-preflight]",
  );
  process.exit(1);
}

const write = process.argv.includes("--write");
const forceUi = process.argv.includes("--ui");
const skipExisting = process.argv.includes("--skip-existing");
const skipPreflight = process.argv.includes("--skip-preflight");

await runAddPasien({
  norm,
  dryRun: !write,
  forceUi,
  skipExisting,
  skipPreflight,
});

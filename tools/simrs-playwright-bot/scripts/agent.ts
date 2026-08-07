#!/usr/bin/env tsx
import { runAgent } from "../src/workflows/agent.js";

const once = process.argv.includes("--once");

try {
  await runAgent({ once });
} catch (e) {
  console.error(e);
  process.exit(1);
}

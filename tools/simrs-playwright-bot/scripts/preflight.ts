#!/usr/bin/env tsx
import { runPreflight, printPreflight } from "../src/util/preflight.js";

const r = await runPreflight();
printPreflight(r);
process.exit(r.ok ? 0 : 1);

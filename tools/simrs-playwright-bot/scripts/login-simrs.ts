#!/usr/bin/env tsx
import { loginSimrsWeb } from "../src/simrs/login.js";

try {
  const path = await loginSimrsWeb();
  console.log("SIMRS storageState:", path);
} catch (e) {
  console.error(e);
  process.exit(1);
}

#!/usr/bin/env tsx
import { ensureIdikSession, loginIdikPlaywright } from "../src/idik/login.js";

const useUi = process.argv.includes("--ui");
try {
  const session = useUi
    ? await loginIdikPlaywright()
    : await ensureIdikSession();
  console.log("idik session OK", session.storageStatePath);
} catch (e) {
  console.error(e);
  process.exit(1);
}

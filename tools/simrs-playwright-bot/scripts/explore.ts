#!/usr/bin/env tsx
import { runExploreMenus } from "../src/simrs/explore-menus.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0) return process.argv[i + 1];
  return undefined;
}

const headed = process.argv.includes("--headed");
if (headed) process.env.HEADLESS = "false";

const screenshotsRaw = arg("--screenshots") || "rm";
const screenshots =
  screenshotsRaw === "all" || screenshotsRaw === "none"
    ? screenshotsRaw
    : "rm";

await runExploreMenus({
  maxDepth: arg("--max-depth") ? Number(arg("--max-depth")) : undefined,
  only: arg("--only"),
  countOnly: process.argv.includes("--count-only"),
  screenshots,
  resume: !process.argv.includes("--no-resume"),
});

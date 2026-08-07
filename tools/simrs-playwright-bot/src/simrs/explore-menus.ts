import fs from "node:fs";
import path from "node:path";
import type { Page, Locator } from "playwright";
import { config, ensureDirs } from "../config.js";
import { sleep } from "../util/timing.js";
import { isDangerousLabel } from "./dangerous.js";
import { ensureSimrsSession, launchSimrsBrowser, isSimrsLoggedInUrl } from "./login.js";
import { runPreflight, printPreflight } from "../util/preflight.js";
import {
  dismissOverlays,
  listImmediateSubmenus,
  listTopLevelMenus,
} from "./menu-helpers.js";

export type MenuNode = {
  label: string;
  path: string[];
  href?: string;
  url?: string;
  depth: number;
  visible: boolean;
  skippedReason?: string;
  forbidden?: boolean;
  hasRmSearch?: boolean;
  error?: string;
  children?: MenuNode[];
};

export type MenuMap = {
  schemaVersion: 1;
  host: string;
  user: string;
  startedAt: string;
  finishedAt?: string;
  roleNote: string;
  roots: MenuNode[];
  summary?: {
    leaves: number;
    skipped: number;
    errors: number;
    withRmSearch: number;
  };
};

type ExploreOptions = {
  maxDepth?: number;
  only?: string;
  countOnly?: boolean;
  screenshots?: "all" | "rm" | "none";
  resume?: boolean;
};

const CHECKPOINT = () =>
  path.join(config.checkpointDir, "explore-checkpoint.json");
const MAP_OUT = () =>
  path.join(config.artifactsDir, "simrs-menu-map.json");

function loadCheckpoint(): { donePaths: string[]; map?: MenuMap } {
  try {
    if (!fs.existsSync(CHECKPOINT())) return { donePaths: [] };
    return JSON.parse(fs.readFileSync(CHECKPOINT(), "utf8")) as {
      donePaths: string[];
      map?: MenuMap;
    };
  } catch {
    return { donePaths: [] };
  }
}

function saveCheckpoint(donePaths: string[], map: MenuMap) {
  ensureDirs();
  fs.writeFileSync(
    CHECKPOINT(),
    JSON.stringify({ donePaths, map, at: Date.now() }, null, 2),
  );
}

async function detectRmSearch(page: Page): Promise<boolean> {
  const frames = page.frames();
  for (const frame of frames) {
    try {
      const hit = await frame
        .locator(
          'input[name*="rm" i], input[id*="rm" i], input[placeholder*="RM" i], label:has-text("No. RM"), label:has-text("No RM"), text=/No\\.?\\s*RM/i',
        )
        .count();
      if (hit > 0) return true;
    } catch {
      /* ignore frame */
    }
  }
  return false;
}

async function pageLooksForbidden(page: Page): Promise<boolean> {
  const t = await page.locator("body").innerText().catch(() => "");
  return /akses ditolak|tidak berhak|permission denied|forbidden/i.test(t);
}

export async function runExploreMenus(opts: ExploreOptions = {}) {
  const maxDepth = opts.maxDepth ?? config.exploreMaxDepth;
  const screenshots = opts.screenshots ?? "rm";

  const pf = await runPreflight({ skipIdik: true });
  printPreflight(pf);
  if (!pf.simrsWeb.ok) {
    process.exitCode = 1;
    return;
  }

  await ensureSimrsSession();
  const { browser, page } = await launchSimrsBrowser({ useStorage: true });

  const startedAt = new Date().toISOString();
  const map: MenuMap = {
    schemaVersion: 1,
    host: config.simrsWebUrl,
    user: config.simrsWebUser || "(env)",
    startedAt,
    roleNote: "Menu visible bergantung role akun bot (mis. cathlab)",
    roots: [],
  };

  const checkpoint = opts.resume !== false ? loadCheckpoint() : { donePaths: [] };
  const done = new Set(checkpoint.donePaths ?? []);
  const visitedUrls = new Set<string>();
  let leaves = 0;
  let skipped = 0;
  let errors = 0;
  let withRm = 0;

  try {
    await page.goto(config.simrsWebUrl.replace(/\/?$/, "/") + "index.php?c=main", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    if (
      !isSimrsLoggedInUrl(page.url()) &&
      (await page.getByText(/Halaman Login/i).count()) > 0
    ) {
      throw new Error("Session SIMRS habis — jalankan login-simrs dulu");
    }

    const tops = await listTopLevelMenus(page);
    console.log(`Top-level menus ditemukan: ${tops.length}`);

    for (const top of tops) {
      const label = ((await top.innerText().catch(() => "")) || "").trim();
      if (!label) continue;
      if (opts.only && !label.toLowerCase().includes(opts.only.toLowerCase())) {
        continue;
      }

      const root: MenuNode = {
        label,
        path: [label],
        depth: 0,
        visible: true,
        children: [],
      };
      map.roots.push(root);

      if (opts.countOnly) {
        const subs = await listImmediateSubmenus(page, top);
        root.children = subs.map((s) => ({
          label: s.label,
          path: [label, s.label],
          depth: 1,
          visible: true,
        }));
        await dismissOverlays(page);
        continue;
      }

      await crawlNode(page, top, root, {
        maxDepth,
        screenshots,
        done,
        visitedUrls,
        onLeaf: (n) => {
          leaves++;
          if (n.skippedReason) skipped++;
          if (n.error) errors++;
          if (n.hasRmSearch) withRm++;
          console.log(
            `[explore] ${n.path.join(" > ")}${n.skippedReason ? ` (${n.skippedReason})` : ""}${n.hasRmSearch ? " [RM]" : ""}`,
          );
          saveCheckpoint([...done], map);
        },
      });
      await dismissOverlays(page);
      await sleep(config.exploreClickDelayMs);
    }

    map.finishedAt = new Date().toISOString();
    map.summary = { leaves, skipped, errors, withRmSearch: withRm };
    ensureDirs();
    fs.writeFileSync(MAP_OUT(), JSON.stringify(map, null, 2));
    console.log(`Wrote ${MAP_OUT()}`);
    console.log("Summary:", map.summary);
  } finally {
    await browser.close();
  }
}

async function crawlNode(
  page: Page,
  locator: Locator,
  node: MenuNode,
  ctx: {
    maxDepth: number;
    screenshots: "all" | "rm" | "none";
    done: Set<string>;
    visitedUrls: Set<string>;
    onLeaf: (n: MenuNode) => void;
  },
) {
  const pathKey = node.path.join(">");
  if (ctx.done.has(pathKey)) return;
  if (node.depth >= ctx.maxDepth) {
    node.skippedReason = "max-depth";
    ctx.done.add(pathKey);
    ctx.onLeaf(node);
    return;
  }

  if (isDangerousLabel(node.label)) {
    node.skippedReason = "dangerous";
    ctx.done.add(pathKey);
    ctx.onLeaf(node);
    return;
  }

  const children = await listImmediateSubmenus(page, locator);
  if (children.length === 0) {
    // Leaf — open page
    try {
      const href = await locator.getAttribute("href").catch(() => null);
      if (href) node.href = href;
      await locator.click({ timeout: 8000 });
      await sleep(config.exploreClickDelayMs);
      node.url = page.url();
      if (ctx.visitedUrls.has(node.url)) {
        node.skippedReason = "dedupe-url";
      } else {
        ctx.visitedUrls.add(node.url);
        if (await pageLooksForbidden(page)) node.forbidden = true;
        node.hasRmSearch = await detectRmSearch(page);
        if (
          ctx.screenshots === "all" ||
          (ctx.screenshots === "rm" && node.hasRmSearch)
        ) {
          const dir = path.join(config.artifactsDir, "simrs-explore");
          fs.mkdirSync(dir, { recursive: true });
          const file = path.join(
            dir,
            `${node.path.join("__").replace(/[^\w\-]+/g, "_").slice(0, 80)}.png`,
          );
          await page.screenshot({ path: file, fullPage: false });
        }
      }
      // Prefer back to main if possible
      if (!isSimrsLoggedInUrl(page.url())) {
        await page
          .goto(config.simrsWebUrl.replace(/\/?$/, "/") + "index.php?c=main", {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
          })
          .catch(() => undefined);
      }
    } catch (e: unknown) {
      node.error = e instanceof Error ? e.message : String(e);
    }
    ctx.done.add(pathKey);
    ctx.onLeaf(node);
    return;
  }

  node.children = [];
  for (const child of children) {
    const childNode: MenuNode = {
      label: child.label,
      path: [...node.path, child.label],
      depth: node.depth + 1,
      visible: true,
    };
    node.children.push(childNode);
    // Re-hover parent chain is fragile; reopen from top each child via path labels when depth>1
    await dismissOverlays(page);
    await sleep(Math.min(300, config.exploreClickDelayMs));
    await crawlNode(page, child.locator, childNode, ctx);
  }
  ctx.done.add(pathKey);
}

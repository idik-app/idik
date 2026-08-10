import fs from "node:fs";
import path from "node:path";
import { config, ensureDirs } from "../config.js";
import { sleep } from "../util/timing.js";
import { findTopLevelMenuByLabel } from "./menu-helpers.js";
import {
  clickButtonByText,
  readBySelector,
  waitForTeachClick,
} from "./teach-element.js";
import { postBotStatus } from "../idik/bot-status.js";
import { ensureSharedSimrsBrowser } from "./shared-browser.js";

export type JobStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error" | "waiting_user";
  error?: string;
};

export type RecipeRunOpts = {
  recipe: string;
  mode: "explore" | "teach_element" | "tulis";
  noRm?: string;
  fieldKey?: string;
  simrsSelector?: string | null;
  holdMs?: number;
  onSteps?: (steps: JobStep[]) => Promise<void>;
};

function mark(
  steps: JobStep[],
  id: string,
  status: JobStep["status"],
  error?: string,
): JobStep[] {
  return steps.map((s) => (s.id === id ? { ...s, status, error } : s));
}

async function emit(
  steps: JobStep[],
  onSteps?: RecipeRunOpts["onSteps"],
  stepId?: string,
) {
  if (onSteps) await onSteps(steps);
  await postBotStatus(null, {
    state: "running",
    norm: stepId?.slice(0, 32),
    steps,
    step: stepId,
    heartbeat: true,
  });
}

async function openRecipe(page: import("playwright").Page, recipe: string) {
  if (recipe === "rekam_medis") {
    const menu = await findTopLevelMenuByLabel(page, "Rekam Medis");
    if (!menu) throw new Error("Menu Rekam Medis tidak ditemukan");
    await menu.click({ timeout: 15_000 });
    return;
  }
  // erm_ri_perawat — ExtJS buttons by text, never ext-gen*
  await clickButtonByText(page, "ERM");
  await sleep(600);
  try {
    await clickButtonByText(page, "ERM RI PERAWAT");
  } catch {
    await clickButtonByText(page, "ERM RI");
  }
}

/**
 * Run SIMRS recipe with step progress for checklist UI.
 * Uses shared headed SIMRS browser (kept open across teach jobs).
 */
export async function runSimrsRecipe(
  opts: RecipeRunOpts,
): Promise<{
  screenshot?: string;
  selector?: string;
  label?: string;
  value?: string;
  steps: JobStep[];
}> {
  ensureDirs();
  const recipe = opts.recipe || "erm_ri_perawat";

  if (opts.mode === "teach_element") {
    let steps: JobStep[] = [
      {
        id: "wait_click",
        label: `Menunggu klik elemen${opts.fieldKey ? ` (${opts.fieldKey})` : ""}`,
        status: "pending",
      },
    ];

    const { page } = await ensureSharedSimrsBrowser({ slowMoMs: 80 });
    // Bring window forward best-effort
    await page.bringToFront().catch(() => undefined);

    steps = mark(steps, "wait_click", "running");
    await emit(steps, opts.onSteps, "wait_click");
    try {
      const taught = await waitForTeachClick(page, { timeoutMs: 180_000 });
      steps = mark(steps, "wait_click", "done");
      await emit(steps, opts.onSteps, "wait_click");
      console.log(
        "[teach] selector tersimpan di job — browser SIMRS tetap terbuka",
      );
      return {
        selector: taught.selector,
        label: taught.label,
        value: taught.value,
        steps,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      steps = mark(steps, "wait_click", "error", msg);
      await emit(steps, opts.onSteps, "wait_click");
      console.error("[teach] gagal:", msg);
      console.log(
        "[teach] Browser SIMRS tetap terbuka — navigasi manual lalu Ajar ulang",
      );
      throw e;
    }
  }

  let steps: JobStep[] =
    opts.mode === "tulis"
      ? [
          { id: "login_simrs", label: "Login SIMRS", status: "pending" },
          { id: "open_recipe", label: `Buka ${recipe}`, status: "pending" },
          {
            id: "cari_rm",
            label: `Cari NO.RM${opts.noRm ? ` ${opts.noRm}` : ""}`,
            status: "pending",
          },
          {
            id: "baca_elemen",
            label: "Baca elemen (selector)",
            status: "pending",
          },
          {
            id: "confirm_value",
            label: "Konfirmasi nilai (Setujui di checklist)",
            status: "pending",
          },
          { id: "tulis_idik", label: "Tulis ke idik", status: "pending" },
        ]
      : [
          { id: "login_simrs", label: "Login SIMRS", status: "pending" },
          { id: "open_recipe", label: `Buka ${recipe}`, status: "pending" },
          { id: "screenshot", label: "Screenshot", status: "pending" },
        ];

  steps = mark(steps, "login_simrs", "running");
  await emit(steps, opts.onSteps, "login_simrs");

  const { page } = await ensureSharedSimrsBrowser({ slowMoMs: 80 });
  await page.bringToFront().catch(() => undefined);

  const mainUrl =
    config.simrsWebUrl.replace(/\/?$/, "/") + "index.php?c=main";
  // Only navigate home if we need recipe open from a known root
  if (!/c=main/i.test(page.url())) {
    await page.goto(mainUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
  }

  steps = mark(steps, "login_simrs", "done");
  steps = mark(steps, "open_recipe", "running");
  await emit(steps, opts.onSteps, "open_recipe");

  await openRecipe(page, recipe);
  await sleep(800);
  steps = mark(steps, "open_recipe", "done");
  await emit(steps, opts.onSteps, "open_recipe");

  if (opts.mode === "explore") {
    steps = mark(steps, "screenshot", "running");
    await emit(steps, opts.onSteps, "screenshot");
    const dir = path.join(config.artifactsDir, "simrs-explore");
    fs.mkdirSync(dir, { recursive: true });
    const shot = path.join(dir, `${recipe}-${Date.now()}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    steps = mark(steps, "screenshot", "done");
    await emit(steps, opts.onSteps, "screenshot");
    if (opts.holdMs) await sleep(opts.holdMs);
    return { screenshot: shot, steps };
  }

  // tulis
  steps = mark(steps, "cari_rm", "running");
  await emit(steps, opts.onSteps, "cari_rm");
  if (opts.noRm) {
    const search = page
      .locator(
        'input[placeholder*="RM" i], input[name*="rm" i], input[id*="rm" i], input[type="search"]',
      )
      .first();
    if ((await search.count()) > 0) {
      await search.fill(opts.noRm);
      await page.keyboard.press("Enter").catch(() => undefined);
      await sleep(1000);
    } else {
      console.warn(
        "[recipe] kotak cari RM tidak ditemukan — lanjut baca selector",
      );
    }
  }
  steps = mark(steps, "cari_rm", "done");
  steps = mark(steps, "baca_elemen", "running");
  await emit(steps, opts.onSteps, "baca_elemen");

  if (!opts.simrsSelector) {
    throw new Error("selector_stale: mapping belum punya simrs_selector");
  }
  let value: string;
  try {
    value = await readBySelector(page, opts.simrsSelector);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      msg.includes("element_not_found")
        ? `element_not_found — perlu ajar ulang`
        : msg,
    );
  }
  if (!value.trim()) {
    throw new Error("element_not_found — nilai kosong / elemen tidak terbaca");
  }
  steps = mark(steps, "baca_elemen", "done");
  steps = mark(steps, "confirm_value", "waiting_user");
  await emit(steps, opts.onSteps, "confirm_value");

  return { value, steps };
}

import fs from "node:fs";
import path from "node:path";
import { config, ensureDirs } from "../config.js";
import { sleep } from "../util/timing.js";
import { findTopLevelMenuByLabel } from "./menu-helpers.js";
import {
  clickButtonByText,
  clickBySelector,
  fillBySelector,
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

export type TaughtRecipeStep = {
  id: string;
  kind: "click_selector" | "fill" | "read_selector";
  label: string;
  selector: string;
  value?: string;
};

export type TeachAction = "continue" | "finish" | "mark_type_rm" | "cancel";

export type TeachPendingInfo = {
  label: string;
  selector: string;
  value: string;
  isInput: boolean;
  index: number;
  warning?: string | null;
  candidates?: {
    selector: string;
    label: string;
    value: string;
    isInput: boolean;
    tag?: string;
    inputType?: string;
    warning?: string | null;
  }[];
};

export type TeachSelectedOverride = {
  selector: string;
  label?: string;
  value?: string;
  isInput?: boolean;
};

export type TeachDecision = {
  action: TeachAction;
  selected?: TeachSelectedOverride | null;
};

export type RecipeRunOpts = {
  recipe: string;
  mode: "explore" | "teach_element" | "tulis";
  noRm?: string;
  fieldKey?: string;
  simrsSelector?: string | null;
  /** Playback langkah ajar; jika kosong fallback openRecipe + baca selector */
  recipeSteps?: TaughtRecipeStep[];
  holdMs?: number;
  onSteps?: (steps: JobStep[]) => Promise<void>;
  /** Dipanggil setelah tiap klik ajar — UI pilih continue/finish/mark_type_rm */
  onTeachAwaitDecision?: (info: {
    steps: JobStep[];
    taughtSteps: TaughtRecipeStep[];
    pending: TeachPendingInfo;
  }) => Promise<TeachDecision>;
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
  await clickButtonByText(page, "ERM");
  await sleep(600);
  try {
    await clickButtonByText(page, "ERM RI PERAWAT");
  } catch {
    await clickButtonByText(page, "ERM RI");
  }
}

async function playbackTaughtSteps(
  page: import("playwright").Page,
  taught: TaughtRecipeStep[],
  noRm: string | undefined,
  onSteps: RecipeRunOpts["onSteps"],
): Promise<{ value: string; steps: JobStep[] }> {
  let steps: JobStep[] = taught.map((t) => ({
    id: t.id,
    label: t.label,
    status: "pending",
  }));
  steps.push({
    id: "confirm_value",
    label: "Konfirmasi nilai (Setujui di checklist)",
    status: "pending",
  });

  let value = "";
  for (const t of taught) {
    steps = mark(steps, t.id, "running");
    await emit(steps, onSteps, t.id);
    if (t.kind === "click_selector") {
      await clickBySelector(page, t.selector);
      await sleep(500);
    } else if (t.kind === "fill") {
      const fillVal =
        t.value === "{{no_rm}}" || !t.value ? noRm || "" : t.value;
      if (!fillVal) throw new Error("no_rm wajib untuk langkah isi RM");
      await fillBySelector(page, t.selector, fillVal);
      await sleep(300);
    } else if (t.kind === "read_selector") {
      value = await readBySelector(page, t.selector);
    }
    steps = mark(steps, t.id, "done");
    await emit(steps, onSteps, t.id);
  }

  if (!value.trim()) {
    throw new Error("element_not_found — nilai kosong / elemen tidak terbaca");
  }
  steps = mark(steps, "confirm_value", "waiting_user");
  await emit(steps, onSteps, "confirm_value");
  return { value, steps };
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
  taughtSteps?: TaughtRecipeStep[];
  steps: JobStep[];
}> {
  ensureDirs();
  const recipe = opts.recipe || "erm_ri_perawat";

  if (opts.mode === "teach_element") {
    const { page } = await ensureSharedSimrsBrowser({ slowMoMs: 80 });
    await page.bringToFront().catch(() => undefined);

    const taughtSteps: TaughtRecipeStep[] = [];
    let steps: JobStep[] = [
      {
        id: "wait_click_1",
        label: `Menunggu klik langkah 1 di window SIMRS agen${opts.fieldKey ? ` (${opts.fieldKey})` : ""}`,        status: "pending",
      },
    ];

    const maxSteps = 20;
    for (let i = 0; i < maxSteps; i++) {
      const stepId = `wait_click_${i + 1}`;
      if (!steps.some((s) => s.id === stepId)) {
        steps = [
          ...steps,
          {
            id: stepId,
            label: `Menunggu klik langkah ${i + 1} di window SIMRS agen`,            status: "pending",
          },
        ];
      }
      steps = mark(steps, stepId, "running");
      await emit(steps, opts.onSteps, stepId);

      let lastMissAt = 0;
      const taught = await waitForTeachClick(page, {
        timeoutMs: 180_000,
        onMiss: async (reason) => {
          const now = Date.now();
          if (now - lastMissAt < 1500) return;
          lastMissAt = now;
          const missLabel = `Klik tidak terbaca — ${reason} (klik di window SIMRS agen)`;
          steps = steps.map((s) =>
            s.id === stepId
              ? { ...s, label: missLabel, status: "running" }
              : s,
          );
          await emit(steps, opts.onSteps, stepId);
        },
      });
      const decideId = `decide_${i + 1}`;
      steps = mark(steps, stepId, "done");
      const warnHint = taught.warning ? " (peringatan — pilih/edit elemen)" : "";
      steps = [
        ...steps.filter((s) => s.id !== decideId),
        {
          id: decideId,
          label: `Langkah ${i + 1} terekam: ${taught.label || taught.selector}${warnHint} — pilih kandidat / edit selector lalu Tambah / Selesai`,
          status: "waiting_user",
        },
      ];

      if (!opts.onTeachAwaitDecision) {
        await emit(steps, opts.onSteps, decideId);
        taughtSteps.push({
          id: `step_${i + 1}`,
          kind: "read_selector",
          label: taught.label || `Nilai ${opts.fieldKey || ""}`.trim(),
          selector: taught.selector,
        });
        steps = mark(steps, decideId, "done");
        await emit(steps, opts.onSteps, decideId);
        break;
      }

      // Atomic: steps + teach_pending via waitTeachAction (no prior emit that races)
      const decision = await opts.onTeachAwaitDecision({
        steps,
        taughtSteps,
        pending: {
          label: taught.label,
          selector: taught.selector,
          value: taught.value,
          isInput: taught.isInput,
          index: i,
          warning: taught.warning ?? null,
          candidates: taught.candidates,
        },
      });
      let action = decision.action;
      const picked = decision.selected;
      const resolved = {
        label: (picked?.label || taught.label).trim() || taught.label,
        selector: (picked?.selector || taught.selector).trim() || taught.selector,
        value:
          picked?.value !== undefined && picked?.value !== null
            ? String(picked.value)
            : taught.value,
        isInput:
          typeof picked?.isInput === "boolean" ? picked.isInput : taught.isInput,
      };

      if (action === "mark_type_rm") {
        const fillStep: TaughtRecipeStep = {
          id: `step_${i + 1}`,
          kind: "fill",
          label: resolved.label || "Isi NO.RM",
          selector: resolved.selector,
          value: "{{no_rm}}",
        };
        taughtSteps.push(fillStep);
        steps = mark(
          steps,
          decideId,
          "done",
          undefined,
        );
        // rewrite label
        steps = steps.map((s) =>
          s.id === decideId
            ? { ...s, label: `Langkah ${i + 1}: isi NO.RM (${resolved.selector})`, status: "done" }
            : s,
        );
        await emit(steps, opts.onSteps, decideId);
        // After mark_type_rm, continue waiting for next click unless finish intended —
        // treat as continue.
        action = "continue";
      }

      if (action === "cancel") {
        steps = mark(steps, decideId, "error", "Dibatalkan");
        await emit(steps, opts.onSteps, decideId);
        throw new Error("Ajar dibatalkan");
      }

      if (action === "finish") {
        taughtSteps.push({
          id: `step_${i + 1}`,
          kind: "read_selector",
          label: resolved.label || `Nilai ${opts.fieldKey || ""}`.trim(),
          selector: resolved.selector,
        });
        steps = steps.map((s) =>
          s.id === decideId
            ? {
                ...s,
                label: `Selesai — baca ${resolved.label || resolved.selector}`,
                status: "done",
              }
            : s,
        );
        await emit(steps, opts.onSteps, decideId);
        break;
      }

      // continue — navigasi/klik tombol
      if (action === "continue") {
        // If we already added fill via mark_type_rm, don't double-add click
        const already = taughtSteps.some((t) => t.id === `step_${i + 1}`);
        if (!already) {
          taughtSteps.push({
            id: `step_${i + 1}`,
            kind: "click_selector",
            label: resolved.label || `Klik ${i + 1}`,
            selector: resolved.selector,
          });
        }
        steps = steps.map((s) =>
          s.id === decideId
            ? {
                ...s,
                label: `Langkah ${i + 1} OK — siap klik berikutnya`,
                status: "done",
              }
            : s,
        );
        await emit(steps, opts.onSteps, decideId);
      }

      if (i === maxSteps - 1) {
        throw new Error("Terlalu banyak langkah ajar");
      }
    }

    const readStep = [...taughtSteps].reverse().find((t) => t.kind === "read_selector");
    if (!readStep) {
      throw new Error("Ajar belum selesai — tekan Selesai pada nilai field");
    }

    console.log(
      `[teach] ${taughtSteps.length} langkah tersimpan — browser SIMRS tetap terbuka`,
    );
    return {
      selector: readStep.selector,
      label: readStep.label,
      value: "",
      taughtSteps,
      steps,
    };
  }

  const { page } = await ensureSharedSimrsBrowser({ slowMoMs: 80 });
  await page.bringToFront().catch(() => undefined);

  // Playback ajar multi-langkah
  if (
    opts.mode === "tulis" &&
    opts.recipeSteps &&
    opts.recipeSteps.length > 0
  ) {
    try {
      return await playbackTaughtSteps(
        page,
        opts.recipeSteps,
        opts.noRm,
        opts.onSteps,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        msg.includes("element_not_found")
          ? `element_not_found — perlu ajar ulang`
          : msg,
      );
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

  const mainUrl =
    config.simrsWebUrl.replace(/\/?$/, "/") + "index.php?c=main";
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

  // tulis — fallback tanpa recipe_steps
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

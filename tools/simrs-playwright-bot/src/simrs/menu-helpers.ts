import type { Page, Locator } from "playwright";
import { config } from "../config.js";
import { sleep } from "../util/timing.js";
import { isSeparatorLabel } from "./dangerous.js";

export async function dismissOverlays(page: Page) {
  try {
    await page.keyboard.press("Escape");
  } catch {
    /* ignore */
  }
  try {
    await page.mouse.click(10, 10);
  } catch {
    /* ignore */
  }
}

/** Heuristik menu top-level: link/item di header area. */
export async function listTopLevelMenus(page: Page): Promise<Locator[]> {
  // Prefer visible horizontal menu bars
  const candidates = page.locator(
    "ul.nav > li > a, .navbar a, #menu a, .menu a, td.menu a, div.menu a",
  );
  const count = await candidates.count();
  if (count > 0) {
    const out: Locator[] = [];
    for (let i = 0; i < count; i++) {
      const el = candidates.nth(i);
      if (await el.isVisible().catch(() => false)) out.push(el);
    }
    if (out.length) return out;
  }

  // Fallback: known labels from screenshot
  const labels = [
    "Konfigurasi",
    "Rekam Medis",
    "Laporan",
    "Kepegawaian",
    "ETIK RS",
    "Pendaftaran",
    "Pelayanan",
    "Kasir",
    "Surveilans",
    "BPJS",
    "Bank Darah",
    "ERM",
  ];
  const out: Locator[] = [];
  for (const label of labels) {
    const loc = page.getByRole("link", { name: label, exact: true }).first();
    if ((await loc.count()) > 0) out.push(loc);
    else {
      const t = page.getByText(label, { exact: true }).first();
      if ((await t.count()) > 0) out.push(t);
    }
  }
  return out;
}

export async function listImmediateSubmenus(
  page: Page,
  parent: Locator,
): Promise<{ label: string; locator: Locator }[]> {
  await parent.hover({ timeout: 5000 }).catch(() => parent.click());
  await sleep(config.exploreClickDelayMs);
  // Visible dropdown items near menu
  const items = page.locator(
    "ul.dropdown-menu:visible a, .dropdown-menu:visible a, ul.sub-menu:visible a, li.hover ul a, li:hover > ul a",
  );
  const n = await items.count();
  const result: { label: string; locator: Locator }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const loc = items.nth(i);
    const label = ((await loc.innerText().catch(() => "")) || "").trim();
    if (!label || isSeparatorLabel(label) || seen.has(label)) continue;
    seen.add(label);
    result.push({ label, locator: loc });
  }
  return result;
}

export async function findTopLevelMenuByLabel(
  page: Page,
  label: string,
): Promise<Locator | null> {
  const needle = label.toLowerCase();
  const tops = await listTopLevelMenus(page);
  for (const top of tops) {
    const text = ((await top.innerText().catch(() => "")) || "").trim();
    if (text.toLowerCase().includes(needle)) return top;
  }
  const byRole = page.getByRole("link", { name: new RegExp(label, "i") }).first();
  if ((await byRole.count()) > 0) return byRole;
  const byText = page.getByText(new RegExp(label, "i")).first();
  if ((await byText.count()) > 0) return byText;
  return null;
}

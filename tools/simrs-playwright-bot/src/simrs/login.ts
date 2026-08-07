import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { config, ensureDirs } from "../config.js";

const STORAGE_PATH = () =>
  path.join(config.artifactsDir, "storageState-simrs.json");

export async function launchSimrsBrowser(opts?: {
  useStorage?: boolean;
  /** Override config.headless (e.g. force headed for visual inspect). */
  headless?: boolean;
  /** Playwright slowMo ms (human-like delays between actions). */
  slowMoMs?: number;
}): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  ensureDirs();
  const headless = opts?.headless ?? config.headless;
  const browser = await chromium.launch({
    headless,
    slowMo:
      typeof opts?.slowMoMs === "number" && opts.slowMoMs > 0
        ? opts.slowMoMs
        : undefined,
  });
  const use =
    opts?.useStorage !== false && fs.existsSync(STORAGE_PATH())
      ? { storageState: STORAGE_PATH() }
      : {};
  const context = await browser.newContext(use);
  const page = await context.newPage();
  page.on("dialog", async (d) => {
    try {
      if (d.type() === "confirm" || d.type() === "beforeunload") {
        await d.dismiss();
      } else {
        await d.accept();
      }
    } catch {
      /* ignore */
    }
  });
  return { browser, context, page };
}

export function isSimrsLoggedInUrl(url: string): boolean {
  return /index\.php\?c=main/i.test(url) || /c=main/i.test(url);
}

type LaunchOpts = {
  headless?: boolean;
  slowMoMs?: number;
};

export async function loginSimrsWeb(opts?: LaunchOpts): Promise<string> {
  if (!config.simrsWebUser || !config.simrsWebPass) {
    throw new Error("SIMRS_WEB_USER / SIMRS_WEB_PASS wajib di .env");
  }
  const { browser, context, page } = await launchSimrsBrowser({
    useStorage: false,
    headless: opts?.headless,
    slowMoMs: opts?.slowMoMs,
  });
  try {
    await page.goto(config.simrsWebUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    // Label-based + common name attributes for legacy PHP
    const userInput = page
      .locator(
        'input[name="username"], input[name="user"], input[name="userid"], input[type="text"]',
      )
      .first();
    await userInput.waitFor({ timeout: 30_000 });
    await userInput.fill(config.simrsWebUser);

    const passInput = page
      .locator('input[name="password"], input[name="pass"], input[type="password"]')
      .first();
    await passInput.fill(config.simrsWebPass);

    // Jangan klik "Login Dengan Kantorku"
    const loginBtn = page
      .locator(
        'input[type="submit"][value*="Login" i], button:has-text("Login"), input[value="Login"]',
      )
      .filter({ hasNotText: /Kantorku/i })
      .first();
    await loginBtn.click();

    await Promise.race([
      page.waitForURL((u) => isSimrsLoggedInUrl(u.href), { timeout: 45_000 }),
      page.getByText(/Welcome Home/i).waitFor({ timeout: 45_000 }),
      page.getByText(/Sistem Informasi RSUD/i).waitFor({ timeout: 45_000 }),
    ]);

    // Masih di Halaman Login?
    const stillLogin = await page.getByText(/Halaman Login/i).count();
    if (stillLogin > 0 && !isSimrsLoggedInUrl(page.url())) {
      throw new Error("Login SIMRS gagal — masih di Halaman Login");
    }

    await context.storageState({ path: STORAGE_PATH() });
    console.log(`SIMRS login OK → ${page.url()}`);
    return STORAGE_PATH();
  } finally {
    await browser.close();
  }
}

export async function ensureSimrsSession(opts?: LaunchOpts): Promise<string> {
  if (fs.existsSync(STORAGE_PATH())) {
    const { browser, page } = await launchSimrsBrowser({
      useStorage: true,
      headless: opts?.headless,
      slowMoMs: opts?.slowMoMs,
    });
    try {
      await page.goto(config.simrsWebUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      if (
        isSimrsLoggedInUrl(page.url()) ||
        (await page.getByText(/Welcome Home/i).count()) > 0
      ) {
        return STORAGE_PATH();
      }
    } finally {
      await browser.close();
    }
  }
  return loginSimrsWeb(opts);
}

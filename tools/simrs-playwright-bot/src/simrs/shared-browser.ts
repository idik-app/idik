import type { Browser, Page } from "playwright";
import { config } from "../config.js";
import {
  ensureSimrsSession,
  isSimrsLoggedInUrl,
  launchSimrsBrowser,
} from "./login.js";

type Shared = {
  browser: Browser;
  page: Page;
};

let shared: Shared | null = null;
let ensuring: Promise<Shared> | null = null;

function isPageAlive(page: Page): boolean {
  try {
    return !page.isClosed();
  } catch {
    return false;
  }
}

/**
 * One headed SIMRS browser for the agent process.
 * Teach / tulis / explore reuse the same window (no close after each job).
 */
export async function ensureSharedSimrsBrowser(opts?: {
  slowMoMs?: number;
}): Promise<Shared> {
  if (shared && isPageAlive(shared.page)) {
    return shared;
  }
  if (ensuring) return ensuring;

  ensuring = (async () => {
    if (shared) {
      await releaseSharedSimrsBrowser();
    }
    const slowMoMs = opts?.slowMoMs ?? 80;
    await ensureSimrsSession({ headless: false, slowMoMs });
    const { browser, page } = await launchSimrsBrowser({
      useStorage: true,
      headless: false,
      slowMoMs,
    });

    const mainUrl =
      config.simrsWebUrl.replace(/\/?$/, "/") + "index.php?c=main";
    await page.goto(mainUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    if (
      !isSimrsLoggedInUrl(page.url()) &&
      (await page.getByText(/Halaman Login/i).count()) > 0
    ) {
      await browser.close().catch(() => undefined);
      throw new Error("Session SIMRS habis — cek SIMRS_WEB_USER / PASS");
    }

    shared = { browser, page };
    console.log("[simrs-shared] browser headed siap (reuse untuk ajar/jalankan)");
    return shared;
  })();

  try {
    return await ensuring;
  } finally {
    ensuring = null;
  }
}

export function getSharedSimrsPage(): Page | null {
  if (shared && isPageAlive(shared.page)) return shared.page;
  return null;
}

export async function releaseSharedSimrsBrowser(): Promise<void> {
  const cur = shared;
  shared = null;
  if (!cur) return;
  console.log("[simrs-shared] menutup browser SIMRS");
  await cur.browser.close().catch(() => undefined);
}

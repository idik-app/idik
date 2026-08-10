import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { config, ensureDirs } from "../config.js";

const STORAGE_PATH = () =>
  path.join(config.artifactsDir, "storageState-idik.json");
const COOKIE_JAR_PATH = () =>
  path.join(config.artifactsDir, "idik-cookie-jar.json");

export type IdikSession = {
  cookieHeader: string;
  storageStatePath: string;
};

function parseSetCookie(headers: Headers): string[] {
  const anyHeaders = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === "function") {
    return anyHeaders.getSetCookie();
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function cookieHeaderFromSetCookies(setCookies: string[]): string {
  return setCookies
    .map((c) => c.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

export function loadCookieJar(): string | null {
  try {
    if (!fs.existsSync(COOKIE_JAR_PATH())) return null;
    const j = JSON.parse(fs.readFileSync(COOKIE_JAR_PATH(), "utf8")) as {
      cookieHeader?: string;
      at?: number;
    };
    if (!j.cookieHeader) return null;
    // 8 jam
    if (j.at && Date.now() - j.at > 8 * 3600_000) return null;
    return j.cookieHeader;
  } catch {
    return null;
  }
}

function saveCookieJar(cookieHeader: string) {
  ensureDirs();
  fs.writeFileSync(
    COOKIE_JAR_PATH(),
    JSON.stringify({ cookieHeader, at: Date.now() }, null, 2),
  );
}

/** Mode A: POST /api/auth → cookie `session`. */
export async function loginIdikApi(): Promise<IdikSession> {
  if (!config.idikUser || !config.idikPass) {
    throw new Error("IDIK_USER / IDIK_PASS wajib di .env");
  }
  const res = await fetch(`${config.idikBaseUrl}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: config.idikUser,
      password: config.idikPass,
    }),
    redirect: "manual",
  });
  const setCookies = parseSetCookie(res.headers);
  let cookieHeader = cookieHeaderFromSetCookies(setCookies);
  if (!cookieHeader.includes("session=")) {
    // Some runtimes fold cookies; try JSON ok check
    let body: { ok?: boolean; message?: string } = {};
    try {
      body = (await res.json()) as { ok?: boolean; message?: string };
    } catch {
      /* ignore */
    }
    if (!res.ok || !body.ok) {
      throw new Error(
        body.message || `Login idik gagal HTTP ${res.status} (no session cookie)`,
      );
    }
  }
  // Prefer explicit session extraction
  const sessionPart = setCookies
    .map((c) => c.split(";")[0])
    .find((c) => c?.startsWith("session="));
  if (sessionPart) cookieHeader = sessionPart;

  if (!cookieHeader.includes("session=")) {
    throw new Error("Login idik: cookie session tidak ditemukan");
  }

  saveCookieJar(cookieHeader);
  ensureDirs();
  // Minimal storage-compatible dump for Playwright reuse
  fs.writeFileSync(
    STORAGE_PATH(),
    JSON.stringify(
      {
        cookies: [
          {
            name: "session",
            value: cookieHeader.replace(/^session=/, "").split(";")[0],
            domain: new URL(config.idikBaseUrl).hostname,
            path: "/",
            httpOnly: true,
            secure: config.idikBaseUrl.startsWith("https"),
            sameSite: "Lax",
          },
        ],
        origins: [],
      },
      null,
      2,
    ),
  );

  return { cookieHeader, storageStatePath: STORAGE_PATH() };
}

export async function ensureIdikSession(): Promise<IdikSession> {
  const existing = loadCookieJar();
  if (existing) {
    const me = await fetch(`${config.idikBaseUrl}/api/auth/me`, {
      headers: { Cookie: existing },
    });
    if (me.ok) {
      return { cookieHeader: existing, storageStatePath: STORAGE_PATH() };
    }
  }
  return loginIdikApi();
}

export async function launchIdikBrowser(
  session?: IdikSession,
  opts?: { headless?: boolean },
): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  ensureDirs();
  const headless = opts?.headless ?? config.headless;
  const browser = await chromium.launch({ headless });
  const hasState =
    session?.storageStatePath && fs.existsSync(session.storageStatePath);
  const context = await browser.newContext(
    hasState ? { storageState: session!.storageStatePath } : {},
  );
  const page = await context.newPage();
  page.on("dialog", async (d) => {
    try {
      await d.dismiss();
    } catch {
      /* ignore */
    }
  });
  return { browser, context, page };
}

/** Playwright login UI (fallback). */
export async function loginIdikPlaywright(): Promise<IdikSession> {
  if (!config.idikUser || !config.idikPass) {
    throw new Error("IDIK_USER / IDIK_PASS wajib di .env");
  }
  const { browser, context, page } = await launchIdikBrowser();
  try {
    await page.goto(config.idikBaseUrl, { waitUntil: "domcontentloaded" });
    const user = page.locator('input[name="username"]');
    await user.waitFor({ timeout: 45_000 });
    await user.fill(config.idikUser);
    await page.locator('input[name="password"]').fill(config.idikPass);
    await page.locator('button[type="submit"], button:has-text("Login")').first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    ensureDirs();
    await context.storageState({ path: STORAGE_PATH() });
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === "session");
    if (!session) throw new Error("Playwright login: cookie session hilang");
    const cookieHeader = `session=${session.value}`;
    saveCookieJar(cookieHeader);
    return { cookieHeader, storageStatePath: STORAGE_PATH() };
  } finally {
    await browser.close();
  }
}

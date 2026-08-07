import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { config, ensureDirs } from "../config.js";
import { sleep } from "../util/timing.js";
import { isDangerousLabel } from "../simrs/dangerous.js";
import {
  ensureSimrsSession,
  launchSimrsBrowser,
  isSimrsLoggedInUrl,
} from "../simrs/login.js";
import {
  findTopLevelMenuByLabel,
  listImmediateSubmenus,
} from "../simrs/menu-helpers.js";
import { runPreflight, printPreflight } from "../util/preflight.js";

const MENU_LABEL = "Rekam Medis";
const HUMAN_SLOW_MO_MS = 120;

export type LihatRekamMedisOptions = {
  /**
   * Keep browser open this many ms, then close.
   * If omitted, wait until user presses Enter in the terminal.
   */
  holdMs?: number;
  /** Playwright slowMo for human-like clicks (default 120). */
  slowMoMs?: number;
};

export type LihatRekamMedisResult = {
  menu: string;
  submenus: { label: string; dangerous: boolean }[];
  screenshot: string;
};

async function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  await new Promise<void>((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Open SIMRS (headed, human-like), login/session, open Rekam Medis dropdown,
 * log immediate submenus + screenshot. Does not crawl or click dangerous items.
 */
export async function runLihatRekamMedis(
  opts: LihatRekamMedisOptions = {},
): Promise<LihatRekamMedisResult | null> {
  const slowMoMs = opts.slowMoMs ?? HUMAN_SLOW_MO_MS;

  const pf = await runPreflight({ skipIdik: true });
  printPreflight(pf);
  if (!pf.simrsWeb.ok) {
    process.exitCode = 1;
    return null;
  }

  // Login/session also headed + slowMo so it looks like a person
  await ensureSimrsSession({ headless: false, slowMoMs });

  const { browser, page } = await launchSimrsBrowser({
    useStorage: true,
    headless: false,
    slowMoMs,
  });

  try {
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
      throw new Error("Session SIMRS habis — jalankan login-simrs dulu");
    }

    const menu = await findTopLevelMenuByLabel(page, MENU_LABEL);
    if (!menu) {
      throw new Error(
        `Menu "${MENU_LABEL}" tidak ditemukan — cek role akun bot`,
      );
    }

    const menuText = ((await menu.innerText().catch(() => "")) || "").trim();
    console.log(`Membuka menu: ${menuText || MENU_LABEL}`);

    const subs = await listImmediateSubmenus(page, menu);
    const submenus = subs.map((s) => ({
      label: s.label,
      dangerous: isDangerousLabel(s.label),
    }));
    console.log(`Submenu langsung (${subs.length}):`);
    for (const s of submenus) {
      const flag = s.dangerous ? " [skip-dangerous]" : "";
      console.log(`  - ${s.label}${flag}`);
    }
    if (subs.length === 0) {
      console.log(
        "  (tidak ada submenu terlihat — dropdown mungkin beda markup)",
      );
    }

    ensureDirs();
    const dir = path.join(config.artifactsDir, "simrs-explore");
    fs.mkdirSync(dir, { recursive: true });
    const shot = path.join(dir, "rekam-medis.png");
    await page.screenshot({ path: shot, fullPage: false });
    console.log(`Screenshot: ${shot}`);

    if (typeof opts.holdMs === "number" && Number.isFinite(opts.holdMs)) {
      console.log(
        `Browser tetap terbuka ${Math.round(opts.holdMs / 1000)}s (Ctrl+C untuk keluar)...`,
      );
      await sleep(opts.holdMs);
    } else {
      await waitForEnter(
        "Browser tetap terbuka. Tekan Enter untuk menutup browser... ",
      );
    }

    return {
      menu: menuText || MENU_LABEL,
      submenus,
      screenshot: shot,
    };
  } finally {
    await browser.close();
  }
}

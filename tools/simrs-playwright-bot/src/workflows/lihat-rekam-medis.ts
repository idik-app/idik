import fs from "node:fs";
import path from "node:path";
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
const HOLD_MS = 30_000;

export type LihatRekamMedisOptions = {
  /** How long to keep headed browser open after opening the menu (ms). */
  holdMs?: number;
};

/**
 * Open SIMRS (headed), login/session, open Rekam Medis dropdown,
 * log immediate submenus + screenshot. Does not crawl or click dangerous items.
 */
export async function runLihatRekamMedis(opts: LihatRekamMedisOptions = {}) {
  const holdMs = opts.holdMs ?? HOLD_MS;

  const pf = await runPreflight({ skipIdik: true });
  printPreflight(pf);
  if (!pf.simrsWeb.ok) {
    process.exitCode = 1;
    return;
  }

  await ensureSimrsSession();

  // Always headed for visual inspect (ignore HEADLESS in .env)
  const { browser, page } = await launchSimrsBrowser({
    useStorage: true,
    headless: false,
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
    console.log(`Submenu langsung (${subs.length}):`);
    for (const s of subs) {
      const flag = isDangerousLabel(s.label) ? " [skip-dangerous]" : "";
      console.log(`  - ${s.label}${flag}`);
    }
    if (subs.length === 0) {
      console.log("  (tidak ada submenu terlihat — dropdown mungkin beda markup)");
    }

    ensureDirs();
    const dir = path.join(config.artifactsDir, "simrs-explore");
    fs.mkdirSync(dir, { recursive: true });
    const shot = path.join(dir, "rekam-medis.png");
    await page.screenshot({ path: shot, fullPage: false });
    console.log(`Screenshot: ${shot}`);

    console.log(
      `Browser tetap terbuka ${Math.round(holdMs / 1000)}s (Ctrl+C untuk keluar)...`,
    );
    await sleep(holdMs);
  } finally {
    await browser.close();
  }
}

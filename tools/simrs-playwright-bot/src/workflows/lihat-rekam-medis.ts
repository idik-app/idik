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
import { ensureIdikSession, launchIdikBrowser } from "../idik/login.js";
import type { Browser } from "playwright";

const MENU_LABEL = "Rekam Medis";
const HUMAN_SLOW_MO_MS = 120;
const IDIK_TINDAKAN_PATH = "/dashboard/layanan/tindakan";

export type LihatRekamMedisOptions = {
  /**
   * Keep browser open this many ms, then close.
   * If omitted, wait until user presses Enter in the terminal.
   */
  holdMs?: number;
  /** Playwright slowMo for human-like clicks (default 120). */
  slowMoMs?: number;
  /**
   * Open headed SIMRS + Rekam Medis at startup.
   * Default false — Suruh bot / Ajar elemen opens SIMRS when needed.
   */
  openSimrs?: boolean;
  /** Open headed IDIK Tindakan window (default true). */
  openIdik?: boolean;
  /** Poll Suruh bot job queue in this process (default true). */
  runAgentPoll?: boolean;
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

async function openSimrsRekamMedis(slowMoMs: number): Promise<{
  browser: Browser;
  menu: string;
  submenus: { label: string; dangerous: boolean }[];
  screenshot: string;
}> {
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

    return {
      browser,
      menu: menuText || MENU_LABEL,
      submenus,
      screenshot: shot,
    };
  } catch (e) {
    await browser.close().catch(() => undefined);
    throw e;
  }
}

/**
 * Default: IDIK Tindakan headed + agen poll (SIMRS dibuka oleh Suruh bot / Ajar elemen).
 * Optional `--simrs`: juga buka Rekam Medis di awal.
 */
export async function runLihatRekamMedis(
  opts: LihatRekamMedisOptions = {},
): Promise<LihatRekamMedisResult | null> {
  const slowMoMs = opts.slowMoMs ?? HUMAN_SLOW_MO_MS;
  const openSimrs = opts.openSimrs === true;
  const openIdik = opts.openIdik !== false;
  const runAgentPoll = opts.runAgentPoll !== false;

  const pf = await runPreflight({
    skipWeb: !openSimrs,
    skipIdik: !openIdik && !runAgentPoll,
  });
  printPreflight(pf);
  if (openSimrs && !pf.simrsWeb.ok) {
    process.exitCode = 1;
    return null;
  }
  if ((openIdik || runAgentPoll) && !pf.idik.ok) {
    process.exitCode = 1;
    return null;
  }

  let simrsBrowser: Browser | null = null;
  let idikBrowser: Browser | null = null;
  const abortAgent = new AbortController();
  let agentPromise: Promise<void> = Promise.resolve();
  let result: LihatRekamMedisResult = {
    menu: "",
    submenus: [],
    screenshot: "",
  };

  try {
    if (openSimrs) {
      const simrs = await openSimrsRekamMedis(slowMoMs);
      simrsBrowser = simrs.browser;
      result = {
        menu: simrs.menu,
        submenus: simrs.submenus,
        screenshot: simrs.screenshot,
      };
    } else {
      console.log(
        "[dual] SIMRS tidak dibuka di awal — Suruh bot / Ajar elemen akan membukanya saat perlu",
      );
    }

    if (openIdik) {
      if (!config.idikUser || !config.idikPass) {
        console.warn(
          "[dual] IDIK_USER / IDIK_PASS kosong — lewati window IDIK",
        );
      } else {
        try {
          const session = await ensureIdikSession();
          const idik = await launchIdikBrowser(session, { headless: false });
          idikBrowser = idik.browser;
          const tindakanUrl = `${config.idikBaseUrl.replace(/\/$/, "")}${IDIK_TINDAKAN_PATH}`;
          await idik.page.goto(tindakanUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60_000,
          });
          if (!/\/dashboard/i.test(idik.page.url())) {
            console.warn(
              "[dual] IDIK belum di dashboard — cek kredensial / session",
            );
          }
          console.log(`[dual] IDIK terbuka: ${tindakanUrl}`);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[dual] gagal buka IDIK:", msg);
        }
      }
    }

    if (runAgentPoll) {
      if (!config.agentToken) {
        console.warn(
          "[agent] SIMRS_BOT_AGENT_TOKEN kosong — Suruh bot tidak akan di-claim",
        );
      } else {
        // Dynamic import avoids circular dependency with agent.ts → lihat-rekam-medis
        const { runAgent } = await import("./agent.js");
        agentPromise = runAgent({ signal: abortAgent.signal }).catch(
          (e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[agent] stopped with error:", msg);
          },
        );
        console.log(
          "[dual] Agen polling jalan — Suruh bot di IDIK akan diproses di sini",
        );
      }
    }

    if (typeof opts.holdMs === "number" && Number.isFinite(opts.holdMs)) {
      console.log(
        `Tetap jalan ${Math.round(opts.holdMs / 1000)}s (Ctrl+C untuk keluar)...`,
      );
      await sleep(opts.holdMs);
    } else {
      await waitForEnter(
        "IDIK + agen tetap terbuka. Tekan Enter untuk menutup... ",
      );
    }

    return result;
  } finally {
    abortAgent.abort();
    await agentPromise.catch(() => undefined);
    if (idikBrowser) {
      await idikBrowser.close().catch(() => undefined);
    }
    if (simrsBrowser) {
      await simrsBrowser.close().catch(() => undefined);
    }
  }
}

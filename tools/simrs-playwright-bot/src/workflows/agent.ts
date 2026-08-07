import { config } from "../config.js";
import { sleep } from "../util/timing.js";
import { postBotStatus } from "../idik/bot-status.js";
import { runLihatRekamMedis } from "./lihat-rekam-medis.js";

type JobRow = {
  id: string;
  action: string;
  status: string;
};

function agentHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.agentToken}`,
  };
}

async function claimJob(): Promise<JobRow | null> {
  const res = await fetch(`${config.idikBaseUrl}/api/system/simrs-bot-jobs/claim`, {
    method: "POST",
    headers: agentHeaders(),
  });
  const json = (await res.json()) as { ok?: boolean; data?: JobRow | null; error?: string };
  if (!res.ok || !json.ok) {
    const detail = json.error || `claim HTTP ${res.status}`;
    throw new Error(detail);
  }
  return json.data ?? null;
}

async function patchJob(
  id: string,
  body: { status: string; error?: string; result?: unknown },
): Promise<void> {
  const res = await fetch(
    `${config.idikBaseUrl}/api/system/simrs-bot-jobs/${id}`,
    {
      method: "PATCH",
      headers: agentHeaders(),
      body: JSON.stringify(body),
    },
  );
  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `patch HTTP ${res.status}`);
  }
}

async function runOneJob(job: JobRow): Promise<void> {
  const t0 = Date.now();
  console.log(`[agent] claimed ${job.id} action=${job.action}`);

  await patchJob(job.id, { status: "running" });
  await postBotStatus(null, { state: "running", norm: job.action.slice(0, 32) });

  try {
    if (job.action !== "lihat_rekam_medis") {
      throw new Error(`action tidak didukung: ${job.action}`);
    }

    const result = await runLihatRekamMedis({ holdMs: 30_000 });
    if (!result) {
      throw new Error("lihat-rekam-medis gagal (preflight/SIMRS)");
    }

    const ms = Date.now() - t0;
    await patchJob(job.id, {
      status: "done",
      result: {
        menu: result.menu,
        submenus: result.submenus,
        // path lokal PC RS — bukan URL publik
        screenshotLocal: result.screenshot,
      },
    });
    await postBotStatus(null, {
      state: "ok",
      norm: job.action.slice(0, 32),
      ms,
    });
    console.log(`[agent] done ${job.id} in ${ms}ms`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const ms = Date.now() - t0;
    console.error(`[agent] error ${job.id}:`, msg);
    await patchJob(job.id, { status: "error", error: msg }).catch(() => undefined);
    await postBotStatus(null, {
      state: "error",
      norm: job.action.slice(0, 32),
      ms,
      error: msg,
    });
  }
}

/**
 * Poll idik job queue and run Playwright jobs on this RS LAN PC.
 * One command: keep this process running; UI enqueue triggers work.
 */
export async function runAgent(opts?: { once?: boolean }) {
  if (!config.agentToken) {
    throw new Error("SIMRS_BOT_AGENT_TOKEN wajib di .env (sama dengan Vercel)");
  }
  if (!config.idikBaseUrl) {
    throw new Error("IDIK_BASE_URL wajib di .env");
  }

  console.log(
    `[agent] polling ${config.idikBaseUrl} every ${config.agentPollMs}ms (Ctrl+C stop)`,
  );

  let stop = false;
  let logged401Hint = false;
  const onSig = () => {
    stop = true;
    console.log("[agent] stopping…");
  };
  process.on("SIGINT", onSig);
  process.on("SIGTERM", onSig);

  try {
    while (!stop) {
      try {
        const job = await claimJob();
        if (job) {
          await runOneJob(job);
          if (opts?.once) break;
          continue;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[agent] poll/claim error:", msg);
        if (!logged401Hint && /401|Unauthorized|belum di-set|tidak cocok|503/i.test(msg)) {
          logged401Hint = true;
          console.error(
            "[agent] HINT: Set SIMRS_BOT_AGENT_TOKEN di Vercel project idik-lemon (nilai sama dengan .env lokal), lalu Redeploy. Akun CLI saat ini tidak punya akses project itu.",
          );
        }
      }
      if (opts?.once) break;
      await sleep(config.agentPollMs);
    }
  } finally {
    process.off("SIGINT", onSig);
    process.off("SIGTERM", onSig);
  }
}

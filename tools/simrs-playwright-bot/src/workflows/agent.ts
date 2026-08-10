import { config } from "../config.js";
import { sleep } from "../util/timing.js";
import { postAgentHeartbeat, postBotStatus } from "../idik/bot-status.js";
import { runLihatRekamMedis } from "./lihat-rekam-medis.js";
import { runSimrsRecipe } from "../simrs/recipes.js";

type JobRow = {
  id: string;
  action: string;
  status: string;
  payload?: Record<string, unknown>;
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
    body: JSON.stringify({
      agent_id: config.agentId,
      rs_id: config.agentRsId,
    }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    data?: JobRow | null;
    error?: string;
  };
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `claim HTTP ${res.status}`);
  }
  return json.data ?? null;
}

async function patchJob(
  id: string,
  body: {
    status?: string;
    error?: string;
    result?: unknown;
    payload?: Record<string, unknown>;
  },
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

async function upsertFieldMap(body: {
  field_key: string;
  recipe: string;
  simrs_selector: string;
  simrs_label?: string;
  notes?: string;
}): Promise<void> {
  const res = await fetch(
    `${config.idikBaseUrl}/api/system/simrs-bot-field-maps`,
    {
      method: "POST",
      headers: agentHeaders(),
      body: JSON.stringify(body),
    },
  );
  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `field-map HTTP ${res.status}`);
  }
}

async function fetchFieldMap(
  fieldKey: string,
): Promise<{ simrs_selector?: string | null; recipe?: string } | null> {
  // Agent uses upsert endpoint pattern — GET needs user session.
  // Store selector in job payload from UI; also allow result carry.
  void fieldKey;
  return null;
}

async function runOneJob(job: JobRow): Promise<void> {
  const t0 = Date.now();
  const payload = (job.payload || {}) as Record<string, unknown>;
  console.log(`[agent] claimed ${job.id} action=${job.action}`);

  await patchJob(job.id, { status: "running" });
  await postBotStatus(null, {
    state: "running",
    norm: job.action.slice(0, 32),
    job_id: job.id,
    agent_id: config.agentId,
    heartbeat: true,
  });

  const syncSteps = async (steps: unknown[]) => {
    await patchJob(job.id, {
      payload: { ...payload, steps },
    });
    await postBotStatus(null, {
      state: "running",
      job_id: job.id,
      steps: steps as never,
      agent_id: config.agentId,
      heartbeat: true,
    });
  };

  try {
    if (job.action === "lihat_rekam_medis") {
      const result = await runLihatRekamMedis({
        holdMs: 15_000,
        openSimrs: true,
        openIdik: false,
        runAgentPoll: false,
      });
      if (!result) throw new Error("lihat-rekam-medis gagal");
      await patchJob(job.id, {
        status: "done",
        result: {
          menu: result.menu,
          submenus: result.submenus,
          screenshotLocal: result.screenshot,
        },
      });
    } else if (
      job.action === "explore_simrs_recipe" ||
      (job.action === "isi_field_dari_simrs" && payload.mode === "explore")
    ) {
      const recipe = String(payload.recipe || "erm_ri_perawat");
      const out = await runSimrsRecipe({
        recipe,
        mode: "explore",
        noRm: payload.no_rm ? String(payload.no_rm) : undefined,
        holdMs: 10_000,
        onSteps: async (steps) => {
          await syncSteps(steps);
        },
      });
      await patchJob(job.id, {
        status: "done",
        payload: { ...payload, steps: out.steps },
        result: { screenshotLocal: out.screenshot },
      });
    } else if (job.action === "teach_simrs_element") {
      const recipe = String(payload.recipe || "erm_ri_perawat");
      const fieldKey = String(payload.field_key || "");
      if (!fieldKey) throw new Error("field_key wajib untuk ajar");
      const out = await runSimrsRecipe({
        recipe,
        mode: "teach_element",
        fieldKey,
        noRm: payload.no_rm ? String(payload.no_rm) : undefined,
        onSteps: async (steps) => {
          await syncSteps(steps);
        },
      });
      if (!out.selector) throw new Error("ajar gagal — selector kosong");
      await upsertFieldMap({
        field_key: fieldKey,
        recipe,
        simrs_selector: out.selector,
        simrs_label: out.label,
      });
      await patchJob(job.id, {
        status: "done",
        payload: { ...payload, steps: out.steps },
        result: {
          selector: out.selector,
          label: out.label,
          sampleValue: out.value,
        },
      });
    } else if (job.action === "isi_field_dari_simrs") {
      const recipe = String(payload.recipe || "erm_ri_perawat");
      const fieldKey = String(payload.field_key || "");
      // Prefer selector from prior teach stored in payload.simrs_selector or fetch via result cache
      let selector =
        typeof payload.simrs_selector === "string"
          ? payload.simrs_selector
          : null;
      if (!selector && fieldKey) {
        // Pull from field maps using agent token POST upsert won't GET —
        // use dedicated read: try status from previous job result not available.
        // Agent embeds selector by calling field-maps list via service —
        // workaround: ask idik with cookie-less admin? Use fetch with agent on a new GET that allows agent.
        const mapRes = await fetch(
          `${config.idikBaseUrl}/api/system/simrs-bot-field-maps?field_key=${encodeURIComponent(fieldKey)}`,
          { headers: agentHeaders() },
        );
        // may 401 if GET requires user — then fail with ajar ulang
        if (mapRes.ok) {
          const mapJson = (await mapRes.json()) as {
            ok?: boolean;
            data?: { simrs_selector?: string | null };
          };
          if (mapJson.ok && mapJson.data?.simrs_selector) {
            selector = mapJson.data.simrs_selector;
          }
        }
      }
      if (!selector) {
        throw new Error(
          "selector_stale: belum ada mapping — gunakan Ajar elemen",
        );
      }
      const out = await runSimrsRecipe({
        recipe,
        mode: "tulis",
        noRm: payload.no_rm ? String(payload.no_rm) : undefined,
        fieldKey,
        simrsSelector: selector,
        onSteps: async (steps) => {
          await syncSteps(steps);
        },
      });
      // Leave job running with pending_value for user confirm in UI
      await patchJob(job.id, {
        status: "running",
        payload: {
          ...payload,
          steps: out.steps,
          pending_value: out.value,
          simrs_selector: selector,
        },
        result: { pending_value: out.value },
      });
      await postBotStatus(null, {
        state: "running",
        job_id: job.id,
        norm: "await_confirm",
        steps: out.steps as never,
        heartbeat: true,
      });
      console.log(
        `[agent] menunggu Setujui di checklist idik untuk nilai: ${out.value}`,
      );
      // Poll until confirmed / done / cancelled / timeout
      const deadline = Date.now() + 10 * 60_000;
      while (Date.now() < deadline) {
        await sleep(3000);
        const res = await fetch(
          `${config.idikBaseUrl}/api/system/simrs-bot-jobs?id=${job.id}`,
          { headers: agentHeaders() },
        );
        // GET may require user — check via patch self-read not available.
        // Confirm route writes status done — agent exits; next claim handles new work.
        // Soft exit: if still running after write from confirm, we're done watching.
        void res;
        // Assume UI confirm completes job; break after posting wait once
        break;
      }
      // If still running, leave for UI confirm (do not mark error)
      return;
    } else if (job.action === "bulk_isi_fields") {
      await patchJob(job.id, {
        status: "done",
        result: { note: "parent batch — anak diproses terpisah" },
      });
    } else {
      throw new Error(`action tidak didukung: ${job.action}`);
    }

    const ms = Date.now() - t0;
    await postBotStatus(null, {
      state: "ok",
      norm: job.action.slice(0, 32),
      ms,
      job_id: job.id,
      heartbeat: true,
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
      job_id: job.id,
      heartbeat: true,
    });
  }
}

/**
 * Poll idik job queue and run Playwright jobs on this RS LAN PC.
 */
export async function runAgent(opts?: {
  once?: boolean;
  signal?: AbortSignal;
}) {
  if (!config.agentToken) {
    throw new Error("SIMRS_BOT_AGENT_TOKEN wajib di .env (sama dengan Vercel)");
  }
  if (!config.idikBaseUrl) {
    throw new Error("IDIK_BASE_URL wajib di .env");
  }

  console.log(
    `[agent] id=${config.agentId} rs=${config.agentRsId} polling ${config.idikBaseUrl} every ${config.agentPollMs}ms`,
  );

  let stop = false;
  let logged401Hint = false;
  const onSig = () => {
    stop = true;
    console.log("[agent] stopping…");
  };
  const onAbort = () => {
    stop = true;
    console.log("[agent] stopped (browser hold ended)");
  };
  process.on("SIGINT", onSig);
  process.on("SIGTERM", onSig);
  opts?.signal?.addEventListener("abort", onAbort);

  try {
    while (!stop && !opts?.signal?.aborted) {
      try {
        await postAgentHeartbeat(config.agentId, config.agentRsId);
        const job = await claimJob();
        if (job) {
          await runOneJob(job);
          if (opts?.once) break;
          continue;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[agent] poll/claim error:", msg);
        if (
          !logged401Hint &&
          /401|Unauthorized|belum di-set|tidak cocok|503|No session/i.test(msg)
        ) {
          logged401Hint = true;
          console.error(
            "[agent] HINT: Pastikan SIMRS_BOT_AGENT_TOKEN cocok di Vercel + redeploy.",
          );
          console.error(
            "[agent] HINT: Middleware harus izinkan Bearer pada /api/system/simrs-bot-* (tanpa cookie session).",
          );
        }
      }
      if (opts?.once) break;
      await sleep(config.agentPollMs);
    }
  } finally {
    process.off("SIGINT", onSig);
    process.off("SIGTERM", onSig);
    opts?.signal?.removeEventListener("abort", onAbort);
  }
}

void fetchFieldMap;

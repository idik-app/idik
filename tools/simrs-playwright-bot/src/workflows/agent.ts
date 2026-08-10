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
  recipe_steps?: unknown[];
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

async function fetchJobPayload(
  jobId: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${config.idikBaseUrl}/api/system/simrs-bot-jobs?id=${encodeURIComponent(jobId)}`,
    { headers: agentHeaders() },
  );
  const json = (await res.json()) as {
    ok?: boolean;
    data?: { payload?: Record<string, unknown> | null; status?: string };
  };
  if (!res.ok || !json.ok || !json.data) {
    throw new Error(`Gagal baca job ${jobId}`);
  }
  if (json.data.status === "cancelled" || json.data.status === "error") {
    return { ...(json.data.payload || {}), teach_action: "cancel" };
  }
  return (json.data.payload || {}) as Record<string, unknown>;
}

async function waitTeachAction(
  jobId: string,
  basePayload: Record<string, unknown>,
  info: {
    steps: unknown[];
    taughtSteps: unknown[];
    pending: {
      label: string;
      selector: string;
      value: string;
      isInput: boolean;
      index: number;
    };
  },
): Promise<"continue" | "finish" | "mark_type_rm" | "cancel"> {
  Object.assign(basePayload, {
    steps: info.steps,
    taught_steps: info.taughtSteps,
    teach_pending: info.pending,
    teach_action: null,
  });
  await patchJob(jobId, {
    status: "running",
    payload: { ...basePayload },
  });
  await postBotStatus(null, {
    state: "running",
    job_id: jobId,
    norm: "teach_decide",
    steps: info.steps as never,
    heartbeat: true,
  });

  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    await sleep(1500);
    const payload = await fetchJobPayload(jobId);
    const action = payload.teach_action;
    if (
      action === "continue" ||
      action === "finish" ||
      action === "mark_type_rm" ||
      action === "cancel"
    ) {
      Object.assign(basePayload, payload, {
        teach_action: null,
        // Clear pending so checklist hides Tambah/Selesai until next click
        teach_pending: null,
      });
      await patchJob(jobId, {
        payload: { ...basePayload },
      });
      return action;
    }
  }
  return "cancel";
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

  const livePayload: Record<string, unknown> = { ...payload };
  const syncSteps = async (steps: unknown[]) => {
    livePayload.steps = steps;
    // Jangan hapus teach_pending / teach_action saat sync progress steps
    await patchJob(job.id, {
      payload: {
        ...livePayload,
        steps,
        teach_pending: livePayload.teach_pending ?? null,
        teach_action: livePayload.teach_action ?? null,
      },
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
        payload: { ...livePayload, steps: out.steps },
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
        onTeachAwaitDecision: async (info) => {
          const action = await waitTeachAction(job.id, livePayload, info);
          livePayload.taught_steps = [
            ...info.taughtSteps,
          ];
          Object.assign(livePayload, await fetchJobPayload(job.id));
          return action;
        },
      });
      if (!out.selector) throw new Error("ajar gagal — selector kosong");
      const taughtSteps = out.taughtSteps || [];
      await upsertFieldMap({
        field_key: fieldKey,
        recipe,
        simrs_selector: out.selector,
        simrs_label: out.label,
        recipe_steps: taughtSteps,
      });
      await patchJob(job.id, {
        status: "done",
        payload: {
          ...livePayload,
          steps: out.steps,
          taught_steps: taughtSteps,
          teach_pending: null,
          teach_action: null,
        },
        result: {
          selector: out.selector,
          label: out.label,
          sampleValue: out.value,
          taughtSteps,
        },
      });
    } else if (job.action === "isi_field_dari_simrs") {
      const recipe = String(payload.recipe || "erm_ri_perawat");
      const fieldKey = String(payload.field_key || "");
      let selector =
        typeof payload.simrs_selector === "string"
          ? payload.simrs_selector
          : null;
      let recipeSteps: import("../simrs/recipes.js").TaughtRecipeStep[] | undefined;
      if (fieldKey) {
        const mapRes = await fetch(
          `${config.idikBaseUrl}/api/system/simrs-bot-field-maps?field_key=${encodeURIComponent(fieldKey)}`,
          { headers: agentHeaders() },
        );
        if (mapRes.ok) {
          const mapJson = (await mapRes.json()) as {
            ok?: boolean;
            data?: {
              simrs_selector?: string | null;
              recipe_steps?: import("../simrs/recipes.js").TaughtRecipeStep[];
            };
          };
          if (mapJson.ok && mapJson.data) {
            if (!selector && mapJson.data.simrs_selector) {
              selector = mapJson.data.simrs_selector;
            }
            if (
              Array.isArray(mapJson.data.recipe_steps) &&
              mapJson.data.recipe_steps.length > 0
            ) {
              recipeSteps = mapJson.data.recipe_steps;
            }
          }
        }
      }
      if (!selector && !(recipeSteps && recipeSteps.length)) {
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
        recipeSteps,
        onSteps: async (steps) => {
          await syncSteps(steps);
        },
      });
      await patchJob(job.id, {
        status: "running",
        payload: {
          ...payload,
          steps: out.steps,
          pending_value: out.value,
          simrs_selector: selector || out.selector,
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
      return;
    } else if (job.action === "bulk_isi_fields") {      await patchJob(job.id, {
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
    const { releaseSharedSimrsBrowser } = await import(
      "../simrs/shared-browser.js"
    );
    await releaseSharedSimrsBrowser();
  }
}

void fetchFieldMap;

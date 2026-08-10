/** Shared types + helpers for SIMRS bot job queue. */

export const SIMRS_BOT_ACTIONS = [
  "lihat_rekam_medis",
  "explore_simrs_recipe",
  "teach_simrs_element",
  "isi_field_dari_simrs",
  "confirm_write_field",
  "bulk_isi_fields",
] as const;

export type SimrsBotAction = (typeof SIMRS_BOT_ACTIONS)[number];

export const SIMRS_BOT_ACTIVE_STATUSES = [
  "pending",
  "claimed",
  "running",
] as const;

export type SimrsBotJobStatus =
  | "pending"
  | "claimed"
  | "running"
  | "done"
  | "error"
  | "cancelled";

export type SimrsBotStepStatus =
  | "pending"
  | "running"
  | "done"
  | "error"
  | "waiting_user";

export type SimrsBotStep = {
  id: string;
  label: string;
  status: SimrsBotStepStatus;
  error?: string;
};

export type SimrsBotJobMode = "explore" | "teach_element" | "tulis" | "bulk";

export type SimrsBotJobPayload = {
  no_rm?: string;
  tindakan_id?: string;
  field_key?: string;
  fields?: string[];
  tab?: string;
  recipe?: string;
  notes?: string;
  mode?: SimrsBotJobMode;
  steps?: SimrsBotStep[];
  /** Cuplikan nilai dari SIMRS menunggu Setujui */
  pending_value?: string | null;
  pending_value_normalized?: string | null;
  confirmed?: boolean;
  confirm_token?: string;
  agent_id?: string;
  rs_id?: string;
  batch_ids?: string[];
  parent_job_id?: string;
  /** Usulan OCR/AI (lapisan atas) */
  ai_suggestions?: { label: string; selector?: string; confidence?: number }[];
  simrs_selector?: string | null;
  /** Langkah ajar terekam (progress) */
  taught_steps?: unknown[];
  /** Langkah terakhir menunggu keputusan UI */
  teach_pending?: {
    label?: string;
    selector?: string;
    value?: string;
    isInput?: boolean;
    index?: number;
  } | null;
  /** Sinyal UI → agen saat ajar multi-langkah */
  teach_action?: "continue" | "finish" | "mark_type_rm" | "cancel" | null;
};

export type SimrsBotJob = {
  id: string;
  action: string;
  status: SimrsBotJobStatus;
  requested_by: string | null;
  error: string | null;
  result: unknown;
  payload: SimrsBotJobPayload | null;
  agent_id: string | null;
  rs_id: string | null;
  parent_job_id: string | null;
  created_at: string;
  claimed_at: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export function isSimrsBotAction(v: unknown): v is SimrsBotAction {
  return (
    typeof v === "string" &&
    (SIMRS_BOT_ACTIONS as readonly string[]).includes(v)
  );
}

export function parseJobPayload(raw: unknown): SimrsBotJobPayload {
  if (!raw || typeof raw !== "object") return {};
  return raw as SimrsBotJobPayload;
}

/** Verify agent Bearer token against SIMRS_BOT_AGENT_TOKEN env. */
export function requireAgentToken(request: Request): boolean {
  return checkAgentToken(request).ok;
}

/**
 * Auth result for agent endpoints — distinguishes missing server env vs bad token.
 */
export function checkAgentToken(request: Request): {
  ok: true;
} | {
  ok: false;
  status: 401 | 503;
  error: string;
} {
  const expected = (process.env.SIMRS_BOT_AGENT_TOKEN || "").trim();
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error:
        "SIMRS_BOT_AGENT_TOKEN belum di-set di server (Vercel) — tambah env lalu redeploy",
    };
  }
  const auth = request.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m || m[1].trim() !== expected) {
    return {
      ok: false,
      status: 401,
      error:
        "Unauthorized — token agen tidak cocok dengan SIMRS_BOT_AGENT_TOKEN di Vercel",
    };
  }
  return { ok: true };
}

/** Build default checklist steps for a mode/recipe. */
export function buildDefaultSteps(opts: {
  mode: SimrsBotJobMode;
  recipe?: string;
  noRm?: string;
  fieldKey?: string;
}): SimrsBotStep[] {
  const recipe = opts.recipe || "erm_ri_perawat";
  const recipeLabel =
    recipe === "rekam_medis" ? "Rekam Medis" : "ERM → ERM RI PERAWAT";
  const rm = opts.noRm ? ` ${opts.noRm}` : "";

  if (opts.mode === "explore") {
    return [
      { id: "login_simrs", label: "Login SIMRS", status: "pending" },
      { id: "open_recipe", label: `Buka ${recipeLabel}`, status: "pending" },
      { id: "screenshot", label: "Screenshot", status: "pending" },
    ];
  }

  if (opts.mode === "teach_element") {
    return [
      {
        id: "wait_click",
        label: `Menunggu klik langkah 1${opts.fieldKey ? ` (${opts.fieldKey})` : ""}`,
        status: "pending",
      },
    ];
  }

  if (opts.mode === "bulk") {
    return [
      { id: "batch_confirm", label: "Konfirmasi batch", status: "waiting_user" },
      { id: "batch_run", label: "Menjalankan antrian", status: "pending" },
    ];
  }

  // tulis
  return [
    { id: "login_simrs", label: "Login SIMRS", status: "pending" },
    { id: "open_recipe", label: `Buka ${recipeLabel}`, status: "pending" },
    { id: "cari_rm", label: `Cari NO.RM${rm}`, status: "pending" },
    { id: "baca_elemen", label: "Baca elemen (selector)", status: "pending" },
    {
      id: "confirm_value",
      label: "Konfirmasi nilai (Setujui di checklist)",
      status: "pending",
    },
    { id: "tulis_idik", label: "Tulis ke idik", status: "pending" },
  ];
}

export function markStep(
  steps: SimrsBotStep[],
  id: string,
  status: SimrsBotStepStatus,
  error?: string,
): SimrsBotStep[] {
  return steps.map((s) =>
    s.id === id
      ? { ...s, status, error: error ?? (status === "error" ? s.error : undefined) }
      : s,
  );
}

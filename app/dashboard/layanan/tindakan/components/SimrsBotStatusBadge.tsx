"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import type { SimrsBotJob } from "@/lib/simrs/botJobs";

type MemoryStatus = {
  state: "idle" | "running" | "ok" | "error";
  norm?: string;
  at: string;
  ms?: number;
  error?: string;
};

const POLL_MS = 8_000;

const ACTIVE = new Set(["pending", "claimed", "running"]);

/**
 * Badge status bot SIMRS — poll job queue + in-memory status.
 * Pause saat tab hidden; bisa dimatikan via NEXT_PUBLIC_SIMRS_BOT_STATUS=0.
 */
export default function SimrsBotStatusBadge() {
  const disabled =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SIMRS_BOT_STATUS === "0";

  const [job, setJob] = useState<SimrsBotJob | null>(null);
  const [memory, setMemory] = useState<MemoryStatus | null>(null);

  useEffect(() => {
    if (disabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      try {
        const [jobRes, memRes] = await Promise.all([
          fetch("/api/system/simrs-bot-jobs", { cache: "no-store" }),
          fetch("/api/system/simrs-bot-status", { cache: "no-store" }),
        ]);
        const jobJson = (await jobRes.json()) as {
          ok?: boolean;
          data?: SimrsBotJob | null;
        };
        const memJson = (await memRes.json()) as {
          ok?: boolean;
          disabled?: boolean;
          data?: MemoryStatus | null;
        };
        if (cancelled) return;
        if (jobJson.ok) setJob(jobJson.data ?? null);
        if (memJson.ok && !memJson.disabled && memJson.data) {
          setMemory(memJson.data);
        }
      } catch {
        /* ignore */
      }
    };

    void load();
    timer = setInterval(load, POLL_MS);

    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [disabled]);

  if (disabled) return null;

  let label: string | null = null;
  let tone: "running" | "ok" | "error" | null = null;
  let title = "";

  if (job && ACTIVE.has(job.status)) {
    tone = "running";
    label =
      job.status === "pending"
        ? "Bot RM · antri…"
        : job.status === "claimed"
          ? "Bot RM · diambil agen…"
          : "Bot RM · berjalan…";
    title = `${job.action} · ${job.status} · ${job.created_at}`;
  } else if (job?.status === "error") {
    tone = "error";
    label = "Bot RM · error";
    title = job.error || job.finished_at || job.created_at;
  } else if (job?.status === "done") {
    const recent =
      job.finished_at &&
      Date.now() - new Date(job.finished_at).getTime() < 60_000;
    if (recent) {
      tone = "ok";
      label = "Bot RM · OK";
      title = job.finished_at || "";
    }
  }

  if (!label && memory && memory.state !== "idle") {
    tone =
      memory.state === "running"
        ? "running"
        : memory.state === "ok"
          ? "ok"
          : "error";
    label =
      memory.state === "running"
        ? `Bot SIMRS · berjalan…${memory.norm ? ` ${memory.norm}` : ""}`
        : memory.state === "ok"
          ? `Bot SIMRS · OK${memory.norm ? ` ${memory.norm}` : ""}${
              typeof memory.ms === "number"
                ? ` · ${(memory.ms / 1000).toFixed(1)}s`
                : ""
            }`
          : `Bot SIMRS · error${memory.norm ? ` ${memory.norm}` : ""}`;
    title = memory.error || memory.at;
  }

  if (!label || !tone) return null;

  return (
    <span
      title={title}
      className={cn(
        UI_LAYERS.hud,
        "inline-flex h-7 max-w-[14rem] shrink-0 items-center truncate rounded-md border px-2 text-[10px] font-semibold tracking-wide",
        tone === "running" &&
          "border-amber-500/50 bg-amber-500/15 text-amber-950 dark:text-white",
        tone === "ok" &&
          "border-emerald-500/50 bg-emerald-500/15 text-emerald-950 dark:text-white",
        tone === "error" &&
          "border-red-500/50 bg-red-500/15 text-red-950 dark:text-white",
      )}
    >
      {label}
    </span>
  );
}

/** Hook-friendly check: true if a job is queued/running. */
export async function fetchSimrsBotJobBusy(): Promise<boolean> {
  try {
    const res = await fetch("/api/system/simrs-bot-jobs", { cache: "no-store" });
    const json = (await res.json()) as { ok?: boolean; data?: SimrsBotJob | null };
    if (!json.ok || !json.data) return false;
    return ACTIVE.has(json.data.status);
  } catch {
    return false;
  }
}

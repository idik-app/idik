"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";

type BotStatus = {
  state: "idle" | "running" | "ok" | "error";
  norm?: string;
  at: string;
  ms?: number;
  error?: string;
};

const POLL_MS = 20_000;

/**
 * Badge status bot SIMRS — sangat hemat:
 * poll 20s, pause saat tab hidden, bisa dimatikan via NEXT_PUBLIC_SIMRS_BOT_STATUS=0.
 */
export default function SimrsBotStatusBadge() {
  const disabled =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SIMRS_BOT_STATUS === "0";

  const [status, setStatus] = useState<BotStatus | null>(null);

  useEffect(() => {
    if (disabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      try {
        const res = await fetch("/api/system/simrs-bot-status", {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          ok?: boolean;
          disabled?: boolean;
          data?: BotStatus | null;
        };
        if (cancelled || json.disabled) return;
        if (json.ok && json.data) setStatus(json.data);
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

  if (disabled || !status || status.state === "idle") return null;

  const label =
    status.state === "running"
      ? `Bot SIMRS · berjalan…${status.norm ? ` ${status.norm}` : ""}`
      : status.state === "ok"
        ? `Bot SIMRS · OK${status.norm ? ` ${status.norm}` : ""}${
            typeof status.ms === "number" ? ` · ${(status.ms / 1000).toFixed(1)}s` : ""
          }`
        : `Bot SIMRS · error${status.norm ? ` ${status.norm}` : ""}`;

  return (
    <span
      title={status.error || status.at}
      className={cn(
        UI_LAYERS.hud,
        "inline-flex h-7 max-w-[14rem] shrink-0 items-center truncate rounded-md border px-2 text-[10px] font-semibold tracking-wide",
        status.state === "running" &&
          "border-amber-500/50 bg-amber-500/15 text-amber-950 dark:text-white",
        status.state === "ok" &&
          "border-emerald-500/50 bg-emerald-500/15 text-emerald-950 dark:text-white",
        status.state === "error" &&
          "border-red-500/50 bg-red-500/15 text-red-950 dark:text-white",
      )}
    >
      {label}
    </span>
  );
}

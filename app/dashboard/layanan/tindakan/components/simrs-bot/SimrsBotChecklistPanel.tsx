"use client";

import SimrsBotAiSuggestBox, {
  suggestLabelsFromText,
} from "./SimrsBotAiSuggest";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Circle, Loader2, Minus, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";
import type { SimrsBotJob, SimrsBotStep } from "@/lib/simrs/botJobs";
import { parseJobPayload } from "@/lib/simrs/botJobs";
import { useSimrsBotPanel, fieldLabel } from "./SimrsBotPanelContext";
import { toast } from "sonner";

const POLL_MS = 2500;

type MemStatus = {
  state: string;
  error?: string;
  at: string;
  steps?: SimrsBotStep[];
  job_id?: string;
};

function StepIcon({ status }: { status: string }) {
  if (status === "done") {
    return <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={3} />;
  }
  if (status === "running" || status === "waiting_user") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />;
  }
  if (status === "error") {
    return <XCircle className="h-3.5 w-3.5 text-red-400" />;
  }
  return <Circle className="h-3.5 w-3.5 text-white/40" />;
}

export default function SimrsBotChecklistPanel() {
  const {
    panel,
    closePanel,
    minimizePanel,
    setRecipe,
    enqueueTeach,
    enqueueRun,
    enqueueExplore,
    recipes,
  } = useSimrsBotPanel();

  const [job, setJob] = useState<SimrsBotJob | null>(null);
  const [memory, setMemory] = useState<MemStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!panel.open && !panel.minimized) return;
    let cancelled = false;

    const load = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      try {
        const jobUrl = panel.jobId
          ? `/api/system/simrs-bot-jobs?id=${encodeURIComponent(panel.jobId)}`
          : "/api/system/simrs-bot-jobs";
        const [jobRes, memRes] = await Promise.all([
          fetch(jobUrl, { cache: "no-store" }),
          fetch("/api/system/simrs-bot-status", { cache: "no-store" }),
        ]);
        const jobJson = (await jobRes.json()) as {
          ok?: boolean;
          data?: SimrsBotJob | null;
        };
        const memJson = (await memRes.json()) as {
          ok?: boolean;
          data?: MemStatus | null;
        };
        if (cancelled) return;
        if (jobJson.ok) setJob(jobJson.data ?? null);
        if (memJson.ok) setMemory(memJson.data ?? null);
      } catch {
        /* ignore */
      }
    };

    void load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [panel.open, panel.minimized, panel.jobId]);

  if (!panel.open || !mounted) return null;

  const payload = job ? parseJobPayload(job.payload) : null;
  const steps: SimrsBotStep[] =
    payload?.steps ||
    memory?.steps ||
    [];
  const pendingValue = payload?.pending_value;
  const needsConfirm =
    job?.status === "running" &&
    Boolean(pendingValue) &&
    !payload?.confirmed &&
    steps.some((s) => s.id === "confirm_value" && s.status !== "done");

  const agentOffline = memory?.state === "agent_offline";
  const target = panel.target;
  const titleField = target ? fieldLabel(target.fieldKey) : "Bot SIMRS";
  const jobActive =
    Boolean(job) &&
    ["pending", "claimed", "running", "error", "done"].includes(job!.status);

  const onConfirm = async (ok: boolean) => {
    if (!job?.id) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/system/simrs-bot-jobs/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id, confirm: ok }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error || "Gagal konfirmasi");
        return;
      }
      toast.success(ok ? "Nilai disimpan ke idik" : "Dibatalkan");
    } finally {
      setConfirming(false);
    }
  };

  const actionButtons = (
    <div className="flex flex-col gap-1.5">
      {target && panel.mapsReady ? (
        <button
          type="button"
          onClick={() => void enqueueRun()}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black uppercase text-white hover:brightness-110"
        >
          Jalankan
        </button>
      ) : null}
      {target ? (
        <button
          type="button"
          onClick={() => void enqueueTeach()}
          className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-black uppercase text-white hover:brightness-110"
          title="Klik elemen di window SIMRS yang sudah terbuka; bot tidak membuka menu"
        >
          {panel.mapsReady ? "Ajar ulang" : "Ajar elemen"}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => void enqueueExplore()}
        className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-white/90 hover:bg-white/10"
      >
        Explore resep saja
      </button>
    </div>
  );

  const panelUi = (
    <aside
      role="complementary"
      aria-label="Checklist Bot SIMRS"
      className={cn(
        "pointer-events-auto fixed bottom-16 right-0 top-14 flex w-[min(100vw,22.5rem)] flex-col border-l border-white/15 bg-slate-950/95 text-white shadow-2xl sm:bottom-4 sm:top-16",
        UI_LAYERS.simrsBotChecklist,
      )}
      style={{ zIndex: Z_INDEX_VALUES.simrsBotChecklist }}
    >
      <header className="flex items-start justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">
            Checklist Bot SIMRS
          </p>
          <p className="truncate text-sm font-bold dark:text-white">
            {target?.noRm ? `RM ${target.noRm}` : "—"}
            {target?.namaPasien ? ` · ${target.namaPasien}` : ""}
          </p>
          <p className="truncate text-xs text-white/85">{titleField}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={minimizePanel}
            className="rounded-md p-1.5 text-white/80 hover:bg-white/10"
            title="Ciutkan"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            onClick={closePanel}
            className="rounded-md p-1.5 text-white/80 hover:bg-white/10"
            title="Tutup"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {agentOffline && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-2 text-xs font-semibold text-amber-50">
            Agen PC RS tidak jalan / offline. Jalankan{" "}
            <code className="text-[10px]">npm run bot:simrs</code> di PC LAN
            (dual mode + agen).
          </div>
        )}

        {target && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">
              Resep SIMRS
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recipes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRecipe(r.id)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[10px] font-bold",
                    panel.recipe === r.id
                      ? "border-violet-400 bg-violet-600 text-white"
                      : "border-white/20 bg-white/5 text-white/90 hover:bg-white/10",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/85">
              Status mapping:{" "}
              {panel.mapsReady
                ? "siap (selector ada)"
                : "belum ajar elemen"}
            </p>
            <p className="text-[11px] leading-snug text-white/85">
              Ajar elemen = klik sekali di SIMRS yang sudah terbuka; bot tidak
              membuka menu. Navigasi manual ke layar yang benar, lalu klik
              field.
            </p>
            {actionButtons}
            {!jobActive ? (
              <SimrsBotAiSuggestBox
                suggestions={suggestLabelsFromText(
                  `${fieldLabel(target.fieldKey)} NO. RM NAMA ALAMAT IGD tiba door balloon`,
                )}
              />
            ) : null}
          </div>
        )}

        {!target && jobActive ? actionButtons : null}

        {steps.length > 0 && (
          <ul className="space-y-1.5">
            {steps.map((s) => (
              <li
                key={s.id}
                className={cn(
                  "flex items-start gap-2 rounded-md px-2 py-1.5 text-xs",
                  s.status === "running" && "bg-amber-500/15",
                  s.status === "error" && "bg-red-500/15",
                  s.status === "done" && "opacity-90",
                )}
              >
                <span className="mt-0.5 shrink-0">
                  <StepIcon status={s.status} />
                </span>
                <span className="min-w-0">
                  <span className="font-semibold dark:text-white">{s.label}</span>
                  {s.error ? (
                    <span className="mt-0.5 block text-[10px] text-red-300">
                      {s.error}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}

        {needsConfirm && (
          <div className="space-y-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200">
              Konfirmasi nilai dari SIMRS
            </p>
            <p className="break-all text-sm font-bold dark:text-white">
              {pendingValue}
            </p>
            {payload?.pending_value_normalized &&
            payload.pending_value_normalized !== pendingValue ? (
              <p className="text-[11px] text-white/80">
                Normalisasi: {payload.pending_value_normalized}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={confirming}
                onClick={() => void onConfirm(true)}
                className="flex-1 rounded-md bg-emerald-600 py-1.5 text-xs font-black text-white disabled:opacity-50"
              >
                Setujui
              </button>
              <button
                type="button"
                disabled={confirming}
                onClick={() => void onConfirm(false)}
                className="flex-1 rounded-md border border-white/25 py-1.5 text-xs font-bold text-white/90 disabled:opacity-50"
              >
                Tolak
              </button>
            </div>
          </div>
        )}

        {job?.status === "error" && (
          <div className="space-y-2 rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs">
            <p className="font-bold text-red-200">{job.error || "Error"}</p>
            {/selector_stale|element_not_found|tidak ditemukan/i.test(
              job.error || "",
            ) && target ? (
              <button
                type="button"
                onClick={() => void enqueueTeach()}
                className="w-full rounded-md bg-violet-600 py-1.5 font-black uppercase text-white"
              >
                Ajar ulang
              </button>
            ) : null}
          </div>
        )}

        {job?.status === "done" && (
          <p className="text-xs font-semibold text-emerald-300">
            Selesai.
          </p>
        )}
      </div>
    </aside>
  );

  return createPortal(panelUi, document.body);
}

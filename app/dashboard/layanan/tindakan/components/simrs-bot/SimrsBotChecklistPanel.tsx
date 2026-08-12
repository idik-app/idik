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

const POLL_MS = 15_000;

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
  const [teachActing, setTeachActing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editSelector, setEditSelector] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editIsInput, setEditIsInput] = useState(false);
  const [pickedKey, setPickedKey] = useState<string | null>(null);

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

  const payload = job ? parseJobPayload(job.payload) : null;
  const teachPending = payload?.teach_pending ?? null;
  const teachPendingKey = teachPending
    ? `${teachPending.index ?? ""}|${teachPending.selector || ""}|${teachPending.label || ""}`
    : "";

  useEffect(() => {
    if (!teachPending) {
      setEditSelector("");
      setEditLabel("");
      setEditValue("");
      setEditIsInput(false);
      setPickedKey(null);
      return;
    }
    setEditSelector(teachPending.selector || "");
    setEditLabel(teachPending.label || "");
    setEditValue(teachPending.value || "");
    setEditIsInput(Boolean(teachPending.isInput));
    setPickedKey(
      teachPending.selector
        ? `${teachPending.selector}::${teachPending.label || ""}`
        : null,
    );
    // Reset local edits only when pending step identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- teachPendingKey is intentional sync key
  }, [teachPendingKey]);

  if (!panel.open || !mounted) return null;

  const steps: SimrsBotStep[] =
    payload?.steps ||
    memory?.steps ||
    [];
  const pendingValue = payload?.pending_value;
  const teachCandidates = teachPending?.candidates || [];
  const decideWaiting = steps.some(
    (s) => s.status === "waiting_user" && s.id.startsWith("decide_"),
  );
  const needsTeachDecision =
    job?.status === "running" &&
    !payload?.teach_action &&
    (Boolean(teachPending) || decideWaiting);
  const waitingClick = steps.some(
    (s) =>
      s.status === "running" &&
      s.id.startsWith("wait_click_"),
  );
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

  const onPickCandidate = (c: {
    selector: string;
    label: string;
    value: string;
    isInput: boolean;
  }) => {
    setPickedKey(`${c.selector}::${c.label}`);
    setEditSelector(c.selector);
    setEditLabel(c.label);
    setEditValue(c.value);
    setEditIsInput(Boolean(c.isInput));
  };

  const onTeachAction = async (
    teach_action: "continue" | "finish" | "mark_type_rm" | "cancel",
  ) => {
    if (!job?.id) return;
    if (teach_action !== "cancel" && !editSelector.trim()) {
      toast.error("Isi / pilih selector elemen dulu");
      return;
    }
    setTeachActing(true);
    try {
      const res = await fetch("/api/system/simrs-bot-jobs/teach-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          teach_action,
          teach_selected:
            teach_action === "cancel"
              ? null
              : {
                  selector: editSelector.trim(),
                  label: editLabel.trim() || undefined,
                  value: editValue,
                  isInput: editIsInput,
                },
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error || "Gagal kirim aksi ajar");
        return;
      }
      if (teach_action === "finish") {
        toast.success("Menyimpan urutan langkah…");
      } else if (teach_action === "continue") {
        toast.message("Lanjut — klik elemen berikutnya di SIMRS");
      } else if (teach_action === "mark_type_rm") {
        toast.message("Ditandai isi NO.RM — klik langkah berikutnya");
      }
    } finally {
      setTeachActing(false);
    }
  };

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
              Ajar multi-langkah: klik di window Chromium SIMRS agen (bukan panel
              ini). Setelah tiap klik pilih kandidat / edit selector, lalu Tambah
              langkah atau Selesai pada nilai field. Opsional tandai kotak NO.RM.
            </p>
            {waitingClick ? (
              <p className="rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-1.5 text-[11px] font-semibold text-amber-50">
                Menunggu klik di window SIMRS agen — lalu kandidat + tombol
                Tambah / Selesai muncul di sini.
              </p>
            ) : null}
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

        {needsTeachDecision && (
          <div className="space-y-2 rounded-lg border border-violet-500/40 bg-violet-500/10 p-2.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-violet-200">
              Langkah terekam — pilih elemen dan aksi
            </p>
            {teachPending ? (
              <>
                {teachPending.warning ? (
                  <p className="rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-1.5 text-[11px] font-semibold text-amber-50">
                    {teachPending.warning} — pilih kandidat lebih sempit atau edit
                    selector di bawah.
                  </p>
                ) : null}
                <p className="text-sm font-bold dark:text-white">
                  {editLabel || teachPending.label || teachPending.selector}
                </p>
                {(editValue || teachPending.value) ? (
                  <p className="break-all text-[11px] text-white/85">
                    Nilai cuplikan: {editValue || teachPending.value}
                  </p>
                ) : null}

                {teachCandidates.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">
                      Kandidat elemen
                    </p>
                    <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                      {teachCandidates.map((c) => {
                        const key = `${c.selector}::${c.label}`;
                        const active = pickedKey === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={teachActing || Boolean(c.warning?.startsWith("kontrol aksi"))}
                            onClick={() => onPickCandidate(c)}
                            className={cn(
                              "rounded-md border px-2 py-1.5 text-left text-[11px] disabled:opacity-40",
                              active
                                ? "border-violet-400 bg-violet-600/40 text-white"
                                : "border-white/20 bg-black/30 text-white/90 hover:bg-white/10",
                            )}
                            title={c.selector}
                          >
                            <span className="block font-bold dark:text-white">
                              {c.label || c.selector}
                            </span>
                            {c.value ? (
                              <span className="mt-0.5 block break-all text-white/85">
                                {c.value.slice(0, 80)}
                                {c.value.length > 80 ? "…" : ""}
                              </span>
                            ) : null}
                            <span className="mt-0.5 block break-all font-mono text-[10px] text-white/75">
                              {c.selector}
                            </span>
                            {c.warning ? (
                              <span className="mt-0.5 block text-[10px] text-amber-200">
                                {c.warning}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white/70">
                    Selector (bisa diedit)
                  </span>
                  <input
                    type="text"
                    value={editSelector}
                    onChange={(e) => setEditSelector(e.target.value)}
                    disabled={teachActing}
                    spellCheck={false}
                    className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-white placeholder:text-white/70 dark:placeholder:text-white/90"
                    placeholder="mis. text:Total · tablecell:Total|Biaya · #id"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white/70">
                    Label singkat
                  </span>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    disabled={teachActing}
                    className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1.5 text-[11px] text-white placeholder:text-white/70 dark:placeholder:text-white/90"
                    placeholder="Label langkah"
                  />
                </label>
              </>
            ) : (
              <p className="text-xs text-white/85">Menyiapkan aksi ajar…</p>
            )}
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                disabled={teachActing || !teachPending || !editSelector.trim()}
                onClick={() => void onTeachAction("continue")}
                className="rounded-md bg-violet-600 py-1.5 text-xs font-black text-white disabled:opacity-50"
              >
                Tambah langkah (klik berikutnya)
              </button>
              <button
                type="button"
                disabled={teachActing || !teachPending || !editSelector.trim()}
                onClick={() => void onTeachAction("finish")}
                className="rounded-md bg-emerald-600 py-1.5 text-xs font-black text-white disabled:opacity-50"
              >
                Selesai (ini nilai field)
              </button>
              <button
                type="button"
                disabled={teachActing || !teachPending || !editSelector.trim()}
                onClick={() => void onTeachAction("mark_type_rm")}
                className="rounded-md border border-white/25 py-1.5 text-xs font-bold text-white/90 disabled:opacity-50"
              >
                Tandai sebagai kotak NO.RM + lanjut
              </button>
              <button
                type="button"
                disabled={teachActing}
                onClick={() => void onTeachAction("cancel")}
                className="rounded-md border border-red-400/40 py-1.5 text-xs font-bold text-red-200 disabled:opacity-50"
              >
                Batalkan ajar
              </button>
            </div>
          </div>
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

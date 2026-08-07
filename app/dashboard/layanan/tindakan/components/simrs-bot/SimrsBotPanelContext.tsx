"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { SimrsBotJob, SimrsBotJobMode } from "@/lib/simrs/botJobs";
import { SIMRS_BOT_RECIPES } from "@/lib/simrs/botFieldMaps";
import { FIELD_LABELS } from "../../bridge/wireframeDrawerTabs";

export type BotAskTarget = {
  tindakanId: string;
  noRm: string;
  namaPasien?: string;
  fieldKey: string;
  tab?: string;
};

type PanelState = {
  open: boolean;
  minimized: boolean;
  target: BotAskTarget | null;
  recipe: string;
  jobId: string | null;
  mapsReady: boolean | null;
};

type Ctx = {
  panel: PanelState;
  openAsk: (target: BotAskTarget) => Promise<void>;
  openChecklist: (jobId?: string | null) => void;
  closePanel: () => void;
  minimizePanel: () => void;
  setRecipe: (recipe: string) => void;
  enqueueTeach: () => Promise<void>;
  enqueueRun: () => Promise<void>;
  enqueueExplore: (recipe?: string) => Promise<void>;
  setJobId: (id: string | null) => void;
  recipes: typeof SIMRS_BOT_RECIPES;
};

const SimrsBotPanelContext = createContext<Ctx | null>(null);

export function useSimrsBotPanel() {
  const ctx = useContext(SimrsBotPanelContext);
  if (!ctx) {
    throw new Error("useSimrsBotPanel must be used within SimrsBotPanelProvider");
  }
  return ctx;
}

export function useSimrsBotPanelOptional() {
  return useContext(SimrsBotPanelContext);
}

async function fetchMapHasSelector(fieldKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/system/simrs-bot-field-maps?field_key=${encodeURIComponent(fieldKey)}`,
      { cache: "no-store" },
    );
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { simrs_selector?: string | null } | null;
    };
    return Boolean(json.ok && json.data?.simrs_selector);
  } catch {
    return false;
  }
}

async function enqueueJob(body: {
  action: string;
  payload: Record<string, unknown>;
}): Promise<SimrsBotJob | null> {
  const res = await fetch("/api/system/simrs-bot-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    error?: string;
    data?: SimrsBotJob;
  };
  if (!res.ok || !json.ok || !json.data) {
    toast.error(json.error || "Gagal antrikan bot");
    return null;
  }
  toast.success("Bot diantrikan — pastikan agen PC RS berjalan");
  return json.data;
}

export function SimrsBotPanelProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<PanelState>({
    open: false,
    minimized: false,
    target: null,
    recipe: "erm_ri_perawat",
    jobId: null,
    mapsReady: null,
  });

  const openAsk = useCallback(async (target: BotAskTarget) => {
    const ready = await fetchMapHasSelector(target.fieldKey);
    setPanel({
      open: true,
      minimized: false,
      target,
      recipe: "erm_ri_perawat",
      jobId: null,
      mapsReady: ready,
    });
  }, []);

  const openChecklist = useCallback((jobId?: string | null) => {
    setPanel((p) => ({
      ...p,
      open: true,
      minimized: false,
      jobId: jobId ?? p.jobId,
    }));
  }, []);

  const closePanel = useCallback(() => {
    setPanel((p) => ({ ...p, open: false, minimized: false }));
  }, []);

  const minimizePanel = useCallback(() => {
    setPanel((p) => ({ ...p, open: false, minimized: true }));
  }, []);

  const setRecipe = useCallback((recipe: string) => {
    setPanel((p) => ({ ...p, recipe }));
  }, []);

  const setJobId = useCallback((id: string | null) => {
    setPanel((p) => ({ ...p, jobId: id }));
  }, []);

  const enqueueTeach = useCallback(async () => {
    const t = panel.target;
    if (!t) return;
    const job = await enqueueJob({
      action: "teach_simrs_element",
      payload: {
        mode: "teach_element" satisfies SimrsBotJobMode,
        recipe: panel.recipe,
        no_rm: t.noRm,
        tindakan_id: t.tindakanId,
        field_key: t.fieldKey,
        tab: t.tab,
      },
    });
    if (job) {
      setPanel((p) => ({ ...p, open: true, minimized: false, jobId: job.id }));
    }
  }, [panel.target, panel.recipe]);

  const enqueueRun = useCallback(async () => {
    const t = panel.target;
    if (!t) return;
    if (!panel.mapsReady) {
      toast.error("Belum ada selector — gunakan Ajar elemen dulu");
      return;
    }
    const job = await enqueueJob({
      action: "isi_field_dari_simrs",
      payload: {
        mode: "tulis" satisfies SimrsBotJobMode,
        recipe: panel.recipe,
        no_rm: t.noRm,
        tindakan_id: t.tindakanId,
        field_key: t.fieldKey,
        tab: t.tab,
      },
    });
    if (job) {
      setPanel((p) => ({ ...p, open: true, minimized: false, jobId: job.id }));
    }
  }, [panel.target, panel.recipe, panel.mapsReady]);

  const enqueueExplore = useCallback(
    async (recipe?: string) => {
      const r = recipe || panel.recipe;
      const job = await enqueueJob({
        action: "explore_simrs_recipe",
        payload: {
          mode: "explore" satisfies SimrsBotJobMode,
          recipe: r,
          no_rm: panel.target?.noRm,
          tindakan_id: panel.target?.tindakanId,
        },
      });
      if (job) {
        setPanel((p) => ({
          ...p,
          open: true,
          minimized: false,
          jobId: job.id,
          recipe: r,
        }));
      }
    },
    [panel.recipe, panel.target],
  );

  const value = useMemo<Ctx>(
    () => ({
      panel,
      openAsk,
      openChecklist,
      closePanel,
      minimizePanel,
      setRecipe,
      enqueueTeach,
      enqueueRun,
      enqueueExplore,
      setJobId,
      recipes: SIMRS_BOT_RECIPES,
    }),
    [
      panel,
      openAsk,
      openChecklist,
      closePanel,
      minimizePanel,
      setRecipe,
      enqueueTeach,
      enqueueRun,
      enqueueExplore,
      setJobId,
    ],
  );

  return (
    <SimrsBotPanelContext.Provider value={value}>
      {children}
    </SimrsBotPanelContext.Provider>
  );
}

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

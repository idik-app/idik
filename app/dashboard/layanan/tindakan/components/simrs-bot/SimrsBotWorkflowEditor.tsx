"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RecipeStepDef } from "@/lib/simrs/botFieldMaps";
import { SIMRS_BOT_RECIPES } from "@/lib/simrs/botFieldMaps";

/** Lapisan atas: editor sederhana susun recipe_steps (bukan DnD library berat). */
export default function SimrsBotWorkflowEditor({
  className,
}: {
  className?: string;
}) {
  const [recipeKey, setRecipeKey] = useState("erm_ri_perawat");
  const [name, setName] = useState("ERM RI PERAWAT");
  const [steps, setSteps] = useState<RecipeStepDef[]>([]);
  const [saving, setSaving] = useState(false);

  const loadDefaults = useCallback((key: string) => {
    const found = SIMRS_BOT_RECIPES.find((r) => r.id === key);
    if (found) {
      setName(found.label);
      setSteps([...found.steps]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/system/simrs-bot-workflows", {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { recipe_key: string; name: string; steps: RecipeStepDef[] }[];
        };
        if (cancelled || !json.ok) return;
        const row = (json.data || []).find((d) => d.recipe_key === recipeKey);
        if (row) {
          setName(row.name);
          setSteps(Array.isArray(row.steps) ? row.steps : []);
        } else {
          loadDefaults(recipeKey);
        }
      } catch {
        loadDefaults(recipeKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recipeKey, loadDefaults]);

  const move = (idx: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j]!, next[idx]!];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/system/simrs-bot-workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, recipe_key: recipeKey, steps }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error || "Gagal simpan workflow");
        return;
      }
      toast.success("Workflow disimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-white/15 bg-slate-900/90 p-3 text-white",
        className,
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">
        Editor workflow (admin)
      </p>
      <div className="flex flex-wrap gap-2">
        {SIMRS_BOT_RECIPES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRecipeKey(r.id)}
            className={cn(
              "rounded-md border px-2 py-1 text-[10px] font-bold",
              recipeKey === r.id
                ? "border-violet-400 bg-violet-600"
                : "border-white/20 bg-white/5",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1.5 text-sm dark:text-white dark:placeholder:text-white/90"
        placeholder="Nama workflow"
      />
      <ul className="space-y-1.5">
        {steps.map((s, i) => (
          <li
            key={`${s.id}-${i}`}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs"
          >
            <span className="min-w-0 flex-1 truncate font-semibold">
              {s.label || s.id}
              {s.text ? ` · “${s.text}”` : ""}
            </span>
            <button type="button" onClick={() => move(i, -1)} className="p-1">
              <ArrowUp size={14} />
            </button>
            <button type="button" onClick={() => move(i, 1)} className="p-1">
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => setSteps((p) => p.filter((_, j) => j !== i))}
              className="p-1 text-red-300"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() =>
          setSteps((p) => [
            ...p,
            {
              id: `step_${Date.now()}`,
              kind: "click_text",
              label: "Klik baru",
              text: "Label",
              role: "button",
            },
          ])
        }
        className="inline-flex items-center gap-1 text-xs font-bold text-violet-200"
      >
        <Plus size={14} /> Tambah langkah
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="w-full rounded-lg bg-violet-600 py-2 text-xs font-black uppercase disabled:opacity-50"
      >
        {saving ? "Menyimpan…" : "Simpan workflow"}
      </button>
    </div>
  );
}

/** Field maps (hasil ajar) + recipes defaults. */

export type RecipeStepKind =
  | "click_text"
  | "click_role"
  | "click_selector"
  | "fill"
  | "wait"
  | "read_selector"
  | "frame";

export type RecipeStepDef = {
  id: string;
  kind: RecipeStepKind;
  label: string;
  /** Teks tombol/link untuk click_text */
  text?: string;
  role?: "button" | "link" | "textbox";
  selector?: string;
  /** Untuk fill — value dari payload.no_rm jika "{{no_rm}}" */
  value?: string;
  ms?: number;
};

export type SimrsBotFieldMap = {
  field_key: string;
  recipe: string;
  notes: string | null;
  simrs_selector: string | null;
  simrs_label: string | null;
  recipe_steps: RecipeStepDef[];
  value_format: string | null;
  updated_at: string;
  updated_by: string | null;
};

export const SIMRS_BOT_RECIPES = [
  {
    id: "erm_ri_perawat",
    label: "ERM → ERM RI PERAWAT",
    steps: [
      {
        id: "click_erm",
        kind: "click_text" as const,
        label: "Klik ERM",
        text: "ERM",
        role: "button" as const,
      },
      {
        id: "click_erm_ri_perawat",
        kind: "click_text" as const,
        label: "Klik ERM RI PERAWAT",
        text: "ERM RI PERAWAT",
        role: "button" as const,
      },
    ],
  },
  {
    id: "rekam_medis",
    label: "Rekam Medis",
    steps: [
      {
        id: "click_rekam_medis",
        kind: "click_text" as const,
        label: "Buka Rekam Medis",
        text: "Rekam Medis",
        role: "link" as const,
      },
    ],
  },
] as const;

export type SimrsBotRecipeId = (typeof SIMRS_BOT_RECIPES)[number]["id"];

export function isSimrsBotRecipeId(v: unknown): v is SimrsBotRecipeId {
  return (
    typeof v === "string" &&
    SIMRS_BOT_RECIPES.some((r) => r.id === v)
  );
}

export function getRecipeSteps(recipeId: string): RecipeStepDef[] {
  const found = SIMRS_BOT_RECIPES.find((r) => r.id === recipeId);
  return found ? [...found.steps] : [...SIMRS_BOT_RECIPES[0].steps];
}

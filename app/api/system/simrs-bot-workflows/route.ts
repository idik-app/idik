import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RecipeStepDef } from "@/lib/simrs/botFieldMaps";

export const dynamic = "force-dynamic";

/** GET — list workflows (editor DnD). */
export async function GET() {
  const user = await requireUser();
  if (!user.ok) return user.response;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("simrs_bot_workflows")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: true, data: data || [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** POST — upsert workflow by recipe_key. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  let body: {
    id?: string;
    name?: string;
    recipe_key?: string;
    steps?: RecipeStepDef[];
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const recipeKey = String(body.recipe_key || "").trim();
  const name = String(body.name || recipeKey).trim();
  if (!recipeKey || !name) {
    return NextResponse.json(
      { ok: false, error: "name dan recipe_key wajib" },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();
    const row = {
      ...(body.id ? { id: body.id } : {}),
      name,
      recipe_key: recipeKey,
      steps: Array.isArray(body.steps) ? body.steps : [],
      updated_at: new Date().toISOString(),
      updated_by: user.userId,
    };
    const { data, error } = await supabase
      .from("simrs_bot_workflows")
      .upsert(row, { onConflict: "recipe_key" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

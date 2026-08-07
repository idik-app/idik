import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAgentToken } from "@/lib/simrs/botJobs";
import type {
  RecipeStepDef,
  SimrsBotFieldMap,
} from "@/lib/simrs/botFieldMaps";

export const dynamic = "force-dynamic";

/** GET — list all field maps or one by ?field_key= */
export async function GET(request: Request) {
  const agentAuth = checkAgentToken(request);
  if (!agentAuth.ok) {
    const user = await requireUser();
    if (!user.ok) return user.response;
  }

  const url = new URL(request.url);
  const fieldKey = url.searchParams.get("field_key");

  try {
    const supabase = createAdminClient();
    if (fieldKey) {
      const { data, error } = await supabase
        .from("simrs_bot_field_maps")
        .select("*")
        .eq("field_key", fieldKey)
        .maybeSingle();
      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { ok: true, data: data as SimrsBotFieldMap | null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data, error } = await supabase
      .from("simrs_bot_field_maps")
      .select("*")
      .order("field_key", { ascending: true });
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: true, data: (data as SimrsBotFieldMap[]) || [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

type UpsertBody = {
  field_key: string;
  recipe?: string;
  notes?: string | null;
  simrs_selector?: string | null;
  simrs_label?: string | null;
  recipe_steps?: RecipeStepDef[];
  value_format?: string | null;
};

/** POST — upsert mapping (user session OR agent token). */
export async function POST(request: Request) {
  const agentAuth = checkAgentToken(request);
  let userId: string | null = null;
  if (!agentAuth.ok) {
    const user = await requireUser();
    if (!user.ok) return user.response;
    userId = user.userId;
  }

  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const fieldKey = String(body.field_key || "").trim();
  if (!fieldKey) {
    return NextResponse.json(
      { ok: false, error: "field_key wajib" },
      { status: 400 },
    );
  }

  const row = {
    field_key: fieldKey,
    recipe: body.recipe || "erm_ri_perawat",
    notes: body.notes ?? null,
    simrs_selector: body.simrs_selector ?? null,
    simrs_label: body.simrs_label ?? null,
    recipe_steps: Array.isArray(body.recipe_steps) ? body.recipe_steps : [],
    value_format: body.value_format ?? null,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("simrs_bot_field_maps")
      .upsert(row, { onConflict: "field_key" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, data: data as SimrsBotFieldMap });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/guards";

const LIMIT = 50;

/**
 * GET    → ambil notifikasi terbaru dari DB (untuk bell Topbar)
 * POST   → tambah notifikasi baru (message, type?)
 * DELETE → hapus satu (?id=uuid) atau hapus semua (tanpa id)
 */
export async function GET() {
  const user = await requireUser();
  if (!user.ok) {
    return NextResponse.json({ ok: true, data: [] });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, message, type, created_at")
      .order("created_at", { ascending: false })
      .limit(LIMIT);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      data: (data ?? []).map((row) => ({
        id: row.id,
        message: row.message,
        type: row.type ?? "info",
        createdAt: row.created_at,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch notifications";
    console.error("❌ GET /api/notifications:", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const type = ["info", "success", "warning", "error", "system"].includes(body.type)
      ? body.type
      : "info";

    if (!message) {
      return NextResponse.json(
        { ok: false, message: "Missing or empty message" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notifications")
      .insert({ message, type })
      .select("id, message, type, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      data: {
        id: data.id,
        message: data.message,
        type: data.type ?? "info",
        createdAt: data.created_at,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create notification";
    console.error("❌ POST /api/notifications:", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();

    const supabase = createAdminClient();
    if (id) {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Notifikasi dihapus" });
    }
    const { data: rows } = await supabase.from("notifications").select("id");
    if (rows?.length) {
      const { error } = await supabase.from("notifications").delete().in("id", rows.map((r) => r.id));
      if (error) throw error;
    }
    return NextResponse.json({ ok: true, message: "Semua notifikasi dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete notification";
    console.error("❌ DELETE /api/notifications:", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

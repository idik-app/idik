import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { getAppUserRowBySessionIdentity } from "@/lib/auth/resolveAppUser";

const MIN_LEN = 6;

/**
 * Ganti password untuk akun yang login lewat cookie JWT (`app_users`).
 * Wajib: password lama benar, password baru minimal 6 karakter.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const supabase = getServiceSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Pengaturan server tidak lengkap (Supabase service role). Hubungi admin.",
      },
      { status: 503 }
    );
  }

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body JSON tidak valid." },
      { status: 400 }
    );
  }

  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { ok: false, message: "Password lama dan password baru wajib diisi." },
      { status: 400 }
    );
  }

  if (newPassword.length < MIN_LEN) {
    return NextResponse.json(
      { ok: false, message: `Password baru minimal ${MIN_LEN} karakter.` },
      { status: 400 }
    );
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { ok: false, message: "Password baru harus berbeda dari password lama." },
      { status: 400 }
    );
  }

  const row = await getAppUserRowBySessionIdentity(supabase, user.userId);
  if (!row?.password_hash) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Akun tidak memiliki password di database lokal (app_users). Hubungi admin.",
      },
      { status: 404 }
    );
  }

  const match = await bcrypt.compare(currentPassword, row.password_hash);
  if (!match) {
    return NextResponse.json(
      { ok: false, message: "Password lama tidak benar." },
      { status: 401 }
    );
  }

  const password_hash = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase
    .from("app_users")
    .update({
      password_hash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) {
    console.error("[POST /api/auth/password]", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Gagal memperbarui password." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Password berhasil diubah.",
  });
}

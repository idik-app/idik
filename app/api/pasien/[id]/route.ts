import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { mapFromSupabase } from "@/app/dashboard/pasien/data/pasienSchema";
import { deletePatient } from "@/app/dashboard/pasien/actions/deletePatient";
import { patchPatientFields } from "@/app/dashboard/pasien/actions/editPatient";

const pasienApiPatchBodySchema = z
  .object({
    noRM: z.string().min(1).optional(),
    nama: z.string().min(1).optional(),
    jenisKelamin: z.enum(["L", "P"]).optional(),
    tanggalLahir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    alamat: z.string().min(1).optional(),
    noHP: z.string().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, {
    message: "Minimal satu field wajib dikirim",
  });

export const dynamic = "force-dynamic";

/*───────────────────────────────────────────────
 📡 GET /api/pasien/:id
 - Satu pasien (untuk drawer detail tindakan / hydrate field master)
───────────────────────────────────────────────*/
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;

    const { id } = await params;
    const idTrim = String(id ?? "").trim();
    if (!idTrim) {
      return NextResponse.json(
        { ok: false, error: "Missing id" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server tidak dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
        },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from("pasien")
      .select("*")
      .eq("id", idTrim)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message ?? "Gagal mengambil pasien" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Pasien tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, data: mapFromSupabase(data) },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("❌ Gagal ambil pasien:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/*───────────────────────────────────────────────
 📡 PATCH /api/pasien/:id
 - Perbarui sebagian field master pasien (autosave drawer)
───────────────────────────────────────────────*/
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;

    const { id } = await params;
    const idTrim = String(id ?? "").trim();
    if (!idTrim) {
      return NextResponse.json(
        { ok: false, error: "Missing id" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = pasienApiPatchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const patient = await patchPatientFields(idTrim, parsed.data);
    return NextResponse.json({ ok: true, data: patient }, { status: 200 });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Terjadi kesalahan server";
    console.error("❌ Gagal patch pasien:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/*───────────────────────────────────────────────
 📡 DELETE /api/pasien/:id
 - Hapus pasien
 - Audit trail dicatat di server action deletePatient
───────────────────────────────────────────────*/
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing id" },
        { status: 400 }
      );
    }

    await deletePatient(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Gagal hapus pasien:", err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}


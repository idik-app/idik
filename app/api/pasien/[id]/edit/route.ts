"use server";

import { NextResponse } from "next/server";
import { pasienSchema } from "@/app/dashboard/pasien/data/pasienSchema";
import { editPatient } from "@/app/dashboard/pasien/actions/editPatient";

/*───────────────────────────────────────────────
 📡 PUT /api/pasien/:id/edit
 - Edit pasien (payload camelCase dari UI)
 - Validasi zod
 - Audit trail dicatat di server action editPatient
───────────────────────────────────────────────*/
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing id" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = pasienSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await editPatient(id, parsed.data as any);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Gagal edit pasien:", err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}


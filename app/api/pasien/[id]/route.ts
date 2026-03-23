"use server";

import { NextResponse } from "next/server";
import { deletePatient } from "@/app/dashboard/pasien/actions/deletePatient";

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


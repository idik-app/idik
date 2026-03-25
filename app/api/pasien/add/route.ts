import { NextResponse } from "next/server";
import { pasienSchema } from "@/app/dashboard/pasien/data/pasienSchema";
import { addPatient } from "@/app/dashboard/pasien/actions/addPatient";

/*───────────────────────────────────────────────
 📡 POST /api/pasien/add
 - Tambah pasien (payload camelCase dari UI)
 - Validasi zod
 - Audit trail dicatat di server action addPatient
───────────────────────────────────────────────*/
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = pasienSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const patient = await addPatient(parsed.data as any);
    return NextResponse.json({ ok: true, data: patient }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Gagal menambah pasien:", err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

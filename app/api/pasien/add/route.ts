import { NextResponse } from "next/server";
import { pasienSchema } from "@/app/dashboard/pasien/data/pasienValidation";
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
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan server";
    console.error("❌ Gagal menambah pasien:", message);
    const conflict =
      message.includes("No. RM") && message.includes("sudah dipakai");
    return NextResponse.json(
      { ok: false, error: message },
      { status: conflict ? 409 : 500 },
    );
  }
}

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
    // Allow snake_case from KlinisAutosaveField
    jenis_kelamin: z.enum(["L", "P"]).optional(),
    tgl_lahir: z.string().optional(),
    alamat: z.string().min(1).optional(),
    noHP: z.string().optional(),
    pci_report_link: z.string().optional().nullable(),
    diagnosa: z.string().optional().nullable(),
    faktor_risiko: z.string().optional().nullable(),
    severity_level: z.string().optional().nullable(),
    hasil_lab_ppm: z.string().optional().nullable(),
    temuan_pembuluh: z.string().optional().nullable(),
    kesimpulan_laporan: z.string().optional().nullable(),
    plan_medis: z.string().optional().nullable(),
    total_kontras: z.string().optional().nullable(),
    air_kerma: z.union([z.number(), z.string()]).optional().nullable(),
    dap_dose: z.union([z.number(), z.string()]).optional().nullable(),
  })
  .transform((val) => {
    const { jenis_kelamin, tgl_lahir, ...rest } = val;
    return {
      ...rest,
      jenisKelamin: rest.jenisKelamin ?? jenis_kelamin,
      tanggalLahir: rest.tanggalLahir ?? tgl_lahir,
    };
  })
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

    const isClinicalStaff = ["admin", "administrator", "superadmin", "perawat", "dokter"].includes(user.role);
    
    // List kolom aman untuk mencegah kebocoran data sensitif (PII) dari tabel pasien
    const SAFE_PASIEN_COLUMNS = new Set([
      "id", "nama", "no_rm", "jenis_kelamin", "jk", "created_at", "updated_at", 
      "jenis_pembiayaan", "kelas_perawatan", "tgl_lahir", "tanggal_lahir",
      "asuransi", "dokter", "pci_report_link", "diagnosa", "faktor_risiko", 
      "severity_level", "hasil_lab_ppm", "temuan_pembuluh", "kesimpulan_laporan", 
      "plan_medis", "total_kontras", "air_kerma", "dap_dose"
    ]);
    
    if (isClinicalStaff) {
      SAFE_PASIEN_COLUMNS.add("alamat");
      SAFE_PASIEN_COLUMNS.add("no_telp");
      SAFE_PASIEN_COLUMNS.add("no_hp");
      SAFE_PASIEN_COLUMNS.add("kontak");
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

    // Filter kolom secara manual sebelum dipetakan
    const filteredData: Record<string, any> = {};
    for (const key in data) {
      if (SAFE_PASIEN_COLUMNS.has(key)) {
        filteredData[key] = (data as any)[key];
      }
    }

    return NextResponse.json(
      { ok: true, data: mapFromSupabase(filteredData) },
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


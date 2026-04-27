import { z } from "zod";
import {
  ICCU_CARA_KELUAR,
  ICCU_INVASIVE_KEYS,
} from "@/lib/iccu-register/constants";

function emptyToNull<V extends z.ZodTypeAny>(schema: V) {
  return z.preprocess((v) => (v === "" ? null : v), schema);
}

const optionalIsoDate = emptyToNull(
  z.union([z.null(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
);

const optionalUuid = emptyToNull(
  z.union([z.null(), z.string().uuid()]).optional(),
);

/** Selaras DB: pasien.id bisa uuid atau integer/bigint (string angka dari API). */
export const iccuRegisterCreateSchema = z.object({
  pasien_id: z.coerce.string().min(1).refine(
    (s) => z.string().uuid().safeParse(s).success || /^\d+$/.test(s),
    "pasien_id harus UUID atau id numerik pasien",
  ),
});

export const iccuRegisterPatchSchema = z
  .object({
    nama: z.string().min(1).optional().nullable(),
    no_rm: z.string().optional().nullable(),
    no_telp: z.string().optional().nullable(),
    jenis_kelamin: z.enum(["L", "P"]).optional().nullable(),
    tanggal_lahir: optionalIsoDate,
    alamat: z.string().optional().nullable(),
    umur_tampilan: z.string().optional().nullable(),
    asal_pasien: z.string().optional().nullable(),
    diagnosa: z.string().optional().nullable(),
    dokter_dpjp_id: optionalUuid,
    jenis_pembiayaan: z.string().optional().nullable(),
    keterangan: z.string().optional().nullable(),
    periode_masuk: optionalIsoDate,
    periode_keluar: optionalIsoDate,
    los_hari: z.number().int().min(0).optional().nullable(),
    cara_keluar: z.enum(ICCU_CARA_KELUAR).optional().nullable(),
    pindah_ruangan_id: optionalUuid,
    meninggal_within_48h: z.boolean().optional().nullable(),
    invasive_procedures: z
      .array(z.enum(ICCU_INVASIVE_KEYS))
      .transform((a) => [...new Set(a)])
      .optional(),
    /** Posisi tempat tidur (label/kode) di unit. */
    bed: z.string().max(50).optional().nullable(),
    /** null = kembalikan ke daftar aktif; ISO string = arsipkan pada waktu tersebut. */
    archived_at: z.union([z.null(), z.string().min(1)]).optional(),
  })
  .strict();

export type IccuRegisterPatchInput = z.infer<typeof iccuRegisterPatchSchema>;

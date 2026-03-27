import { z } from "zod";

/* ------------------------------------------------------------
   Validasi input pasien
------------------------------------------------------------ */
export const pasienSchema = z.object({
  noRM: z.string().min(1, "Nomor RM wajib diisi"),
  nama: z.string().min(1, "Nama pasien wajib diisi"),
  jenisKelamin: z
    .enum(["L", "P"])
    .refine((val) => !!val, { message: "Jenis kelamin wajib dipilih" }),
  tanggalLahir: z
    .string()
    .min(4, "Tanggal lahir wajib diisi")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal lahir tidak valid (YYYY-MM-DD)"),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  noHP: z
    .string()
    .refine(
      (s) => s === "" || /^(\+62|0)[0-9]{8,15}$/.test(s),
      "Nomor HP tidak valid (kosongkan atau format 08… / +62…)"
    ),
  jenisPembiayaan: z
    .enum(["BPJS", "NPBI", "Umum", "Asuransi"])
    .refine((val) => !!val, { message: "Jenis pembiayaan wajib dipilih" }),
  kelasPerawatan: z
    .enum(["Kelas 1", "Kelas 2", "Kelas 3"])
    .refine((val) => !!val, { message: "Kelas perawatan wajib dipilih" }),
  asuransi: z.string().optional().or(z.literal("")),
});

export type PasienFormData = z.infer<typeof pasienSchema>;


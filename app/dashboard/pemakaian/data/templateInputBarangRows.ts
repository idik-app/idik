/**
 * Baris template checklist — disesuaikan dengan lembar consumable / komponen cathlab.
 * `slots` = jumlah kotak isian per baris (nilai disimpan dipisah "|").
 */

export type TemplateChecklistRow = {
  id: string;
  /** Teks di kolom nama */
  label: string;
  /** Jumlah input (varian / jumlah terpisah) */
  slots: number;
  /** Keterangan kanan (merek, dll.) */
  catatan?: string;
};

/** Tab Obat / Alkes — daftar consumable umum */
export const TEMPLATE_OBAT_ALKES: TemplateChecklistRow[] = [
  { id: "oa-1", label: "Electrode Carbon / Biasa", slots: 2 },
  { id: "oa-2", label: "FM Crepe 10 cm / 15 cm 6”", slots: 2 },
  { id: "oa-3", label: "Underpad ON / Steril", slots: 2 },
  { id: "oa-4", label: "Handscoon No. 6 / 6,5", slots: 2, catatan: "PF" },
  { id: "oa-5", label: "Handscoon No. 7 / 7,5", slots: 2, catatan: "PF" },
  { id: "oa-6", label: "Handscoon No. 8", slots: 1, catatan: "PF" },
  { id: "oa-7", label: "Blood Set", slots: 2, catatan: "GEA" },
  { id: "oa-8", label: "Spuit 50 cc / 20 cc", slots: 2 },
  { id: "oa-9", label: "Spuit 10 cc", slots: 1 },
  { id: "oa-10", label: "Spuit 5 cc / 3 cc", slots: 2 },
  {
    id: "oa-11",
    label: "Nacl 1000 ml / 500ml / 100ml / D5 100 ml",
    slots: 4,
  },
  { id: "oa-12", label: "Inviclot Heparin 5000 iu", slots: 1 },
  { id: "oa-13", label: "Lidocain 2 %", slots: 1 },
  {
    id: "oa-14",
    label: "Plastik AIA / Operator / Drape & Remote",
    slots: 3,
  },
  { id: "oa-15", label: "Surflo No 20", slots: 1 },
  { id: "oa-16", label: "Needle No 27 / 18 / 23", slots: 3 },
  {
    id: "oa-17",
    label: "Kontras Xolmetras / Omnipaque 300",
    slots: 2,
  },
  { id: "oa-18", label: "Betadin / kassa", slots: 2 },
  { id: "oa-19", label: "Mes No. 11 / 23 / 15", slots: 3 },
  { id: "oa-20", label: "Nasal / Masker / NRM Oxygen", slots: 3 },
  { id: "oa-21", label: "Jackson rees 2 lt", slots: 1 },
  { id: "oa-22", label: "Kondom Kateter Uk M, L", slots: 2 },
  { id: "oa-23", label: "Urin bag 2000ml", slots: 1 },
  { id: "oa-24", label: "Extention Tube", slots: 1 },
  { id: "oa-25", label: "Instopper", slots: 1 },
  { id: "oa-26", label: "Transofix", slots: 1 },
  { id: "oa-27", label: "Obat Oral", slots: 1 },
  { id: "oa-28", label: "Obat Injeksi", slots: 1 },
  { id: "oa-29", label: "Alkohol Swab", slots: 1 },
  { id: "oa-30", label: "efinefrin 1mg", slots: 1 },
  { id: "oa-31", label: "Spinocain 25 G", slots: 1 },
  { id: "oa-32", label: "mylon (nabic)", slots: 1 },
  { id: "oa-33", label: "opsite 9.5", slots: 1 },
  { id: "oa-34", label: "tigaderm", slots: 1 },
  { id: "oa-35", label: "lidocail elma", slots: 1 },
  { id: "oa-36", label: "pempers dewasa (xl)", slots: 1 },
  { id: "oa-37", label: "jelly (sacet)", slots: 1 },
  { id: "oa-38", label: "evla fiber", slots: 1 },
  { id: "oa-39", label: "Tubing set", slots: 1 },
];

/** Tab Komponen cathlab — alat intervensi */
export const TEMPLATE_KOMPONEN: TemplateChecklistRow[] = [
  { id: "k-1", label: "STENT DES (Drug Elluting Stent)", slots: 1 },
  { id: "k-2", label: "STENT DES (Drug Elluting Stent)", slots: 1 },
  { id: "k-3", label: "STENT DES (Drug Elluting Stent)", slots: 1 },
  { id: "k-4", label: "BALLON PTCA", slots: 1 },
  { id: "k-5", label: "BALLON PTCA", slots: 1 },
  { id: "k-6", label: "BALLON PTCA", slots: 1 },
  { id: "k-7", label: "BALLON PTCA", slots: 1 },
  { id: "k-8", label: "ANGIOGRAPHIC NEEDLE (SELDINGER)", slots: 1 },
  { id: "k-9", label: "INTRODUCER SHEAT", slots: 1 },
  { id: "k-10", label: "INTRODUCER SHEAT", slots: 1 },
  { id: "k-11", label: "GUIDE WIRE 0.035", slots: 1 },
  { id: "k-12", label: "GUIDE WIRE 0.035", slots: 1 },
  { id: "k-13", label: "DIAGNOSTIC CATHETER", slots: 1 },
  { id: "k-14", label: "DIAGNOSTIC CATHETER", slots: 1 },
  { id: "k-15", label: "GUIDING CATHETER", slots: 1 },
  { id: "k-16", label: "GUIDING CATHETER", slots: 1 },
  { id: "k-17", label: "WIRE PTCA 0,014", slots: 1 },
  { id: "k-18", label: "WIRE PTCA 0,014", slots: 1 },
  { id: "k-19", label: "WIRE PTCA 0,014", slots: 1 },
  { id: "k-20", label: "WIRE PTCA 0,014", slots: 1 },
  { id: "k-21", label: "INDEFLATOR", slots: 1 },
  { id: "k-22", label: "BIPOLAR PACING (LEAD TPM)", slots: 1 },
  {
    id: "k-23",
    label: "MICRO CATHETER (fine cross) 130 cm / 150 cm",
    slots: 2,
  },
  {
    id: "k-24",
    label: "ROTABLATOR BURR 1,25 / 1,5 / 1,75",
    slots: 3,
  },
  { id: "k-25", label: "TROMBUSTER CATHETER", slots: 1 },
  { id: "k-26", label: "Pressure Tubing 150 cm", slots: 1 },
  {
    id: "k-27",
    label: "Pressure Tubing 30 cm / 60 cm / 70 cm",
    slots: 3,
  },
  { id: "k-28", label: "Manifold INR", slots: 1 },
  { id: "k-29", label: "TR – BAND", slots: 1 },
  { id: "k-30", label: "COMET PRESSURE GUIDE WIRE", slots: 1 },
  { id: "k-31", label: "(Catatan / item tambahan)", slots: 1 },
];

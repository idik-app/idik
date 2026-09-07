/**
 * Utility untuk ekstraksi data dari teks laporan medis (PCI, CAG, dll).
 * Menggunakan regex untuk menemukan field klinis dan radiologi.
 */

export interface ExtractedReportData {
  nama_pasien?: string;
  no_rm?: string;
  tgl_lahir?: string;
  jenis_kelamin?: string;
  tindakan?: string;
  dokter?: string;
  diagnosa?: string;
  faktor_risiko?: string;
  target_lesion?: string;
  temuan_pembuluh?: string;
  kesimpulan_laporan?: string;
  plan_medis?: string;
  total_kontras?: string;
  air_kerma?: string;
  dap_dose?: string;
  fluoro_time?: string;
  kv?: string;
  ma?: string;
  kategori?: string;
  severity_level?: string;
  hasil_lab_ppm?: string;
  asisten?: string;
  sirkuler?: string;
  logger?: string;
  waktu?: string;
  cath?: string;
  ruangan?: string;
  /** Cek obat dari teks PCI */
  cek_heparin?: boolean;
  cek_heparin_ket?: string;
  cek_ntg_cedocard?: boolean;
  cek_ntg_cedocard_ket?: string;
}

export const extractDataFromText = (text: string): ExtractedReportData => {
  const data: ExtractedReportData = {};
  if (!text) return data;

  const upper = text.toUpperCase();
  const lines = text.split("\n");

  // --- LOGIKA LAMA (Merged) ---
  
  // 1. Diagnosa -> Severity
  if (
    upper.includes("NSTEMI") ||
    upper.includes("SVT") ||
    upper.includes("AVM") ||
    upper.includes("FFR") ||
    upper.includes("IVUS") ||
    upper.includes("OCT") ||
    upper.includes("IVL") ||
    upper.includes("PANCER")
  ) {
    data.severity_level = "2"; // Medium
  } else if (
    upper.includes("STEMI") ||
    upper.includes("TAVB") ||
    upper.includes("ROTA")
  ) {
    data.severity_level = "1"; // High
  } else if (
    upper.includes("UAP") ||
    upper.includes("CVI") ||
    upper.includes("VARISES")
  ) {
    data.severity_level = "3"; // Low
  }

  // 2. Kategori Berdasarkan Kesimpulan / Teks
  if (upper.includes("MILD CAD")) {
    data.kategori = "MILD CAD";
  } else if (
    upper.includes("TRIPLE VESSEL") ||
    upper.includes("TVD") ||
    upper.includes("3VD") ||
    upper.includes("ROTA") ||
    upper.includes("PCI") ||
    upper.includes("STENT") ||
    upper.includes("PTCA")
  ) {
    data.kategori = "PCI";
  } else if (upper.includes("PACEMAKER") || upper.includes("PPM")) {
    data.kategori = "PPM";
    const ppmMatch = text.match(/implantation\s+([\s\S]+)$|implantation\s*\n\s*([\s\S]+)$/i);
    if (ppmMatch) data.hasil_lab_ppm = (ppmMatch[1] || ppmMatch[2]).trim();
  } else if (upper.includes("EP STUDY") || upper.includes("ABLATION")) {
    data.kategori = "EP";
  } else if (upper.includes("EVLA")) {
    data.kategori = "EVLA";
  } else if (upper.includes("DSA") || upper.includes("EMBOLIZATION") || upper.includes("AVM")) {
    data.kategori = "EVT";
  } else if (upper.includes("NORMAL") || upper.includes("FFR") || upper.includes("IFR")) {
    data.kategori = "Diagnostic";
  }

  // 3. Identitas Pasien
  const nameMatch = text.match(/([A-Z\s]{3,}),\s*(TN|NY|NN|AN|BY|MR|MRS|MS)/i);
  if (nameMatch) {
    data.nama_pasien = `${nameMatch[1].trim()} (${nameMatch[2].toUpperCase()})`;
  } else {
    const nameLabelMatch = text.match(/NAME\s*:\s*(?:MR|MRS|MS|TN|NY)?\s*([A-Z\s]+)(?:\n|$)/i);
    if (nameLabelMatch) data.nama_pasien = nameLabelMatch[1].trim();
  }

  const rmMatch = text.match(/(?:REGISTER|RM|ID):\s*([0-9-]+)/i);
  if (rmMatch) data.no_rm = rmMatch[1].trim();

  const dobMatch = text.match(/(?:DATE OF BIRTH|DOB|Lahir):\s*([0-9/-]+)/i);
  if (dobMatch) data.tgl_lahir = dobMatch[1].trim();

  const sexMatch = text.match(/(?:SEX|Gender|Kelamin):\s*(MALE|FEMALE|L|P)/i);
  if (sexMatch) {
    const s = sexMatch[1].toUpperCase();
    data.jenis_kelamin = s.startsWith("M") || s === "L" ? "Laki-laki" : "Perempuan";
  }

  // 4. Tim Medis
  const docMatch = text.match(/(?:Attending Physician|Operator|Dokter)\s*[:|,]\s*\n*\s*(dr\.\s+[a-zA-Z\s,.]+)/i) || 
                   text.match(/(?:^|\n|,)\s*(dr\.\s+[a-zA-Z\s,.]+)/i);
  if (docMatch) data.dokter = docMatch[1].trim();

  const scrubMatch = text.match(/(?:Scrub nurse|Asisten)\s*[:|,]\s*\n*\s*([a-zA-Z\s,.]+)/i);
  if (scrubMatch) data.asisten = scrubMatch[1].trim();

  const circularMatch = text.match(/(?:Circulating nurse|Sirkuler)\s*[:|,]\s*\n*\s*([a-zA-Z\s,.]+)/i);
  if (circularMatch) data.sirkuler = circularMatch[1].trim();

  const loggerMatch = text.match(/(?:Radiographer|Logger)\s*[:|,]\s*\n*\s*([a-zA-Z\s,.]+)/i);
  if (loggerMatch) data.logger = loggerMatch[1].trim();

  // 5. Lokasi & Waktu
  const timeMatch = text.match(/(?:Time|Waktu)\s*[:|,]\s*([0-9:.-]+)/i);
  if (timeMatch) data.waktu = timeMatch[1].trim();

  const cathMatch = text.match(/(?:Cathlab|Lab|Cath)\s*[:|,]\s*([^\n\r,.]+)/i);
  if (cathMatch) data.cath = cathMatch[1].trim();

  const roomMatch = text.match(/(?:Ruangan|Room|Bed)\s*[:|,]\s*([^\n\r,.]+)/i);
  if (roomMatch) data.ruangan = roomMatch[1].trim();

  // 6. Klinis Detail
  const diagLabelMatch = text.match(/(?:Clinical Diagnosis|Diagnosa):\s*([^\n\r]+)/i);
  if (diagLabelMatch) data.diagnosa = diagLabelMatch[1].trim();

  const rfMatch = text.match(/(?:Risk Factor|Faktor Risiko):\s*([^\n\r]+)/i);
  if (rfMatch) data.faktor_risiko = rfMatch[1].trim();

  const targetLesionMatch = text.match(/(?:Target Lesion|Target Lesi|Lesi Target|Lesion Target):\s*([^\n\r]+)/i);
  if (targetLesionMatch) data.target_lesion = targetLesionMatch[1].trim();

  const coronaryLines = lines
    .filter((l) => /^\s*(?:LM|LAD|LCX|RCA)/i.test(l))
    .map((l) => l.trim());
  if (coronaryLines.length > 0) data.temuan_pembuluh = coronaryLines.join("\n");

  const conclusionMatch = text.match(/(?:Conclusion|Kesimpulan):\s*([^\n\r]+)/i);
  if (conclusionMatch) data.kesimpulan_laporan = conclusionMatch[1].trim();

  const planMatch = text.match(/(?:Plan|Rencana):\s*([^\n\r]+)/i);
  if (planMatch) data.plan_medis = planMatch[1].trim();

  // 6.5 Post-processing: Cegah temuan pembuluh koroner masuk ke laporan non-koroner (EVLA, dsb)
  const isPeriferOrVeinTxt = 
    upper.includes("EVLA") || 
    upper.includes("VARISES") || 
    upper.includes("VENA") || 
    upper.includes("LOWER LIMB") ||
    upper.includes("SVT") ||
    upper.includes("ABLATION");
  
  if (isPeriferOrVeinTxt && data.temuan_pembuluh) {
    // Jika laporan vena/aritmia tapi ada LM/LAD (mungkin template sisa atau data lama), kita hapus
    delete data.temuan_pembuluh;
  }

  // 7. Radiologi & Kontras
  const contrastMatch = text.match(/(?:Contrast Total|Total Kontras|Kontras):\s*(\d+)/i);
  if (contrastMatch) data.total_kontras = contrastMatch[1];

  const akMatch = text.match(/(?:Air kerma|Dose|AK):\s*([\d.]+)\s*(?:mGy)?/i);
  if (akMatch) data.air_kerma = akMatch[1];

  const dapMatch = text.match(/(?:DAP|mGycm|mGy.cm|mGy cm):\s*([\d.]+)/i);
  if (dapMatch) data.dap_dose = dapMatch[1];

  const fluoroMatch = text.match(/(?:Fluoro time|Fluoro|FT):\s*([\d.]+)\s*(?:min)?/i);
  if (fluoroMatch) data.fluoro_time = fluoroMatch[1];

  const kvMatch = text.match(/kV:\s*(\d+)/i);
  if (kvMatch) data.kv = kvMatch[1];

  const maMatch = text.match(/mA:\s*(\d+)/i);
  if (maMatch) data.ma = maMatch[1];

  // 8. Cek obat (Heparin / NTG / Cedocard)
  const heparinLine = lines.find((l) => /heparin/i.test(l));
  if (heparinLine || /\bHEPARIN\b/.test(upper)) {
    data.cek_heparin = true;
    const dose =
      heparinLine?.match(
        /heparin[^0-9]*(\d[\d.,]*\s*(?:iu|u|unit|mg)?)/i,
      )?.[1] ?? text.match(/heparin[^0-9]*(\d[\d.,]*\s*(?:iu|u|unit|mg)?)/i)?.[1];
    if (dose) data.cek_heparin_ket = dose.trim();
  }
  const ntgLine = lines.find((l) =>
    /(?:\bNTG\b|nitroglycerin|nitroglycerine|cedocard)/i.test(l),
  );
  if (
    ntgLine ||
    /\bNTG\b/.test(upper) ||
    upper.includes("NITROGLYCERIN") ||
    upper.includes("CEDOCARD")
  ) {
    data.cek_ntg_cedocard = true;
    const dose =
      ntgLine?.match(
        /(?:NTG|nitroglycerin|nitroglycerine|cedocard)[^0-9]*(\d[\d.,]*\s*(?:mcg|µg|ug|mg|\/min)?)/i,
      )?.[1];
    if (dose) data.cek_ntg_cedocard_ket = dose.trim();
  }

  return data;
};

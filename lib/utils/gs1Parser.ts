/**
 * Helper Parser GS1-128 & GS1 DataMatrix untuk Alat Medis & Farmasi.
 * Ekstraksi otomatis GTIN (Kode Barang), Tanggal Kadaluarsa (ED), dan Lot/Batch.
 */

export interface ParsedGS1Data {
  raw: string;
  gtin: string | null;
  expiryDate: string | null; // Format: YYYY-MM-DD
  lotNumber: string | null;
  serialNumber: string | null;
  isGS1: boolean;
}

export function parseGS1Barcode(rawText: string): ParsedGS1Data {
  if (!rawText) {
    return { raw: '', gtin: null, expiryDate: null, lotNumber: null, serialNumber: null, isGS1: false };
  }

  // Strip AIM symbology prefix (e.g., ]C1, ]d2, ]e0, ]Q3) & GS separators
  const cleanedRaw = rawText.trim().replace(/^\][a-zA-Z0-9]{2}/, "");
  const cleanText = cleanedRaw.replace(/[\u001D]/g, '|'); // Replace FNC1 / GS separator with pipe
  let gtin: string | null = null;
  let expiryDate: string | null = null;
  let lotNumber: string | null = null;
  let serialNumber: string | null = null;
  let isGS1 = false;

  // Format GS1 Parentheses: (01)08849610192831(17)280512(10)LOT9921
  const parenGtin = cleanText.match(/\(01\)(\d{14}|\d{13}|\d{12})/);
  const parenExp = cleanText.match(/\(17\)(\d{6})/);
  const parenLot = cleanText.match(/\(10\)([^\(|\s]+)/);
  const parenSn = cleanText.match(/\(21\)([^\(|\s]+)/);

  if (parenGtin || parenExp || parenLot) {
    isGS1 = true;
    if (parenGtin) gtin = parenGtin[1];
    if (parenExp) expiryDate = parseYYMMDDToISO(parenExp[1]);
    if (parenLot) lotNumber = parenLot[1];
    if (parenSn) serialNumber = parenSn[1];
  } else if (cleanText.startsWith('01') && cleanText.length >= 16) {
    // Format GS1 Raw Concatenated: 01088496101928311728051210LOT9921
    isGS1 = true;
    gtin = cleanText.substring(2, 16);

    const expIdx = cleanText.indexOf('17', 16);
    if (expIdx !== -1 && expIdx + 8 <= cleanText.length) {
      const yyMMdd = cleanText.substring(expIdx + 2, expIdx + 8);
      if (/^\d{6}$/.test(yyMMdd)) {
        expiryDate = parseYYMMDDToISO(yyMMdd);
      }
    }

    const lotIdx = cleanText.indexOf('10', 16);
    if (lotIdx !== -1) {
      const endIdx = cleanText.indexOf('|', lotIdx);
      lotNumber = endIdx !== -1 ? cleanText.substring(lotIdx + 2, endIdx) : cleanText.substring(lotIdx + 2);
    }
  }

  return {
    raw: rawText,
    gtin: gtin || cleanedRaw || rawText,
    expiryDate,
    lotNumber,
    serialNumber,
    isGS1,
  };
}

function parseYYMMDDToISO(yyMMdd: string): string | null {
  if (!/^\d{6}$/.test(yyMMdd)) return null;

  const yy = parseInt(yyMMdd.substring(0, 2), 10);
  const mm = parseInt(yyMMdd.substring(2, 4), 10);
  const dd = parseInt(yyMMdd.substring(4, 6), 10);

  // Century detection (assuming 2000+)
  const fullYear = 2000 + yy;
  const monthStr = String(mm).padStart(2, '0');
  const dayStr = String(Math.max(1, Math.min(31, dd))).padStart(2, '0');

  return `${fullYear}-${monthStr}-${dayStr}`;
}

export function calculateEDStatus(expiryDate: string | null): 'Aman' | 'Mendekati' | 'Expired' | 'Non-ED' {
  if (!expiryDate) return 'Non-ED';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);

  if (isNaN(exp.getTime())) return 'Non-ED';

  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays <= 60) return 'Mendekati';
  return 'Aman';
}

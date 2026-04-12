import { NextRequest, NextResponse } from "next/server";
import { extractDataFromText } from "@/lib/tindakan/reportExtractor";

/**
 * API Endpoint untuk mengambil teks dari Google Doc Public dan mengekstrak datanya.
 * Digunakan oleh UI (KlinisAutosaveField) untuk ekstraksi manual.
 */

/** Cache hasil ekstraksi (10 menit) */
const fetchDocCache = new Map<string, { data: any, expires: number }>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId");

  if (!docId) {
    return NextResponse.json({ error: "Missing docId" }, { status: 400 });
  }

  const now = Date.now();
  const cached = fetchDocCache.get(docId);
  if (cached && now < cached.expires) {
    return NextResponse.json({ success: true, data: cached.data, cached: true });
  }

  try {
    // Gunakan export link Google Docs untuk mengambil teks polos (format=txt)
    // Syarat: File harus "Public" atau "Anyone with the link can view"
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: "Gagal mengambil dokumen. Pastikan link Google Docs sudah diset 'Anyone with the link can view'.",
        status: response.status 
      }, { status: 400 });
    }

    const text = await response.text();
    const extracted = extractDataFromText(text);

    // Update Cache
    fetchDocCache.set(docId, {
      data: extracted,
      expires: now + 10 * 60 * 1000 // 10 menit
    });

    return NextResponse.json({ 
      success: true, 
      data: extracted,
      rawText: text.slice(0, 500) + "..." // Untuk debug jika perlu
    });

  } catch (err: any) {
    console.error("[Fetch Doc API Error]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

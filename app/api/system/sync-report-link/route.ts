import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractDataFromText } from "@/lib/tindakan/reportExtractor";

/**
 * API Endpoint untuk Autosinkron Laporan dari Google Drive (via Google Apps Script)
 * URL: /api/system/sync-report-link
 */

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("x-sync-token");
  
  // Gunakan token sederhana dari env atau default
  const EXPECTED_TOKEN = process.env.INTERNAL_SYNC_TOKEN || "idik-sync-secret-2026";

  if (authHeader !== EXPECTED_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { fileName, url, year, noRm, content } = body;

    if (!url || !year) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Logika Matching (Mirip dengan scripts/map-report-links.mjs)
    let matchedId = null;

    // 1. Coba match via RM + Tahun
    if (noRm) {
      const normalizedRm = String(noRm).replace(/\D/g, "").padStart(6, "0");
      const { data: rmMatches } = await supabase
        .from("tindakan")
        .select("id, pci_report_link")
        .eq("no_rm", normalizedRm)
        .gte("tanggal", `${year}-01-01`)
        .lte("tanggal", `${year}-12-31`)
        .limit(1);

      if (rmMatches && rmMatches.length > 0) {
        matchedId = rmMatches[0].id;
      }
    }

    // 2. Coba match via Nama (dari FileName) + Tahun (jika RM gagal)
    if (!matchedId) {
      // Ekstrak nama kasar dari filename (sebelum koma pertama biasanya)
      const rawName = fileName.split(",")[0].toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      
      if (rawName.length > 3) {
        const { data: nameMatches } = await supabase
          .from("tindakan")
          .select("id, pci_report_link")
          .ilike("nama_pasien", `%${rawName}%`)
          .gte("tanggal", `${year}-01-01`)
          .lte("tanggal", `${year}-12-31`)
          .limit(1);

        if (nameMatches && nameMatches.length > 0) {
          matchedId = nameMatches[0].id;
        }
      }
    }

    if (matchedId) {
      // Persiapkan data untuk update
      const updateData: Record<string, any> = { pci_report_link: url };

      // Jika ada content, ekstrak data klinis
      if (content) {
        const extracted = extractDataFromText(content);
        // Gabungkan hasil ekstraksi ke payload update
        Object.assign(updateData, extracted);
        console.log(`[Sync API] Extracted data for record ${matchedId}:`, Object.keys(extracted));
      }

      const { error: updateErr } = await supabase
        .from("tindakan")
        .update(updateData)
        .eq("id", matchedId);

      if (updateErr) throw updateErr;

      return NextResponse.json({ 
        success: true, 
        message: `Linked and synced record ID ${matchedId}`,
        matchedId,
        extractedFields: content ? Object.keys(extractDataFromText(content)) : []
      });
    }

    return NextResponse.json({ 
      success: false, 
      message: "No matching tindakan record found" 
    });

  } catch (err: any) {
    console.error("[Sync API Error]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

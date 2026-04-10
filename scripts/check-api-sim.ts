
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function checkApiSimulation() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing env vars");
    return;
  }

  const supabase = createClient(url, key);

  console.log("Simulating API fetch logic...");
  const projection = "id, tanggal, dokter, nama_pasien, no_rm, tindakan, status, ruangan, pasien_id, created_at, is_fast_track, pasien_datang_igd, door_to_balloon, total_waktu_fast_track, cath, asisten, sirkuler, logger, diagnosa, severity_level, hasil_lab_ppm, tarif_tindakan, total, krs, selisih, consumable, pemakaian";
  
  const { data, error } = await supabase
    .from("tindakan")
    .select(projection)
    .order("tanggal", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching tindakan:", error);
    return;
  }

  console.log(`Fetched ${data?.length} rows.`);
  const rowsWithPemakaian = data?.filter(r => r.pemakaian && String(r.pemakaian).trim() !== "");
  console.log(`Rows with pemakaian: ${rowsWithPemakaian?.length}`);
  
  if (rowsWithPemakaian && rowsWithPemakaian.length > 0) {
    console.log("Sample row with pemakaian:", JSON.stringify(rowsWithPemakaian[0], null, 2));
  } else {
    console.log("NO ROWS WITH PEMAKAIAN IN THE LAST 10 ROWS.");
    
    // Search for ANY row with pemakaian to see what it looks like
    const { data: anyPemakaian } = await supabase
      .from("tindakan")
      .select(projection)
      .not("pemakaian", "is", null)
      .neq("pemakaian", "")
      .limit(1);
      
    if (anyPemakaian && anyPemakaian.length > 0) {
      console.log("Found a row with pemakaian elsewhere:", JSON.stringify(anyPemakaian[0], null, 2));
    }
  }
}

checkApiSimulation();

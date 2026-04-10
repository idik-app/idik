
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function checkDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing env vars");
    return;
  }

  const supabase = createClient(url, key);

  console.log("Checking 'tindakan' table...");
  const { data, error, count } = await supabase
    .from("tindakan")
    .select("id, pemakaian, tanggal", { count: "exact" })
    .not("pemakaian", "is", null)
    .neq("pemakaian", "")
    .limit(5);

  if (error) {
    console.error("Error fetching tindakan:", error);
  } else {
    console.log(`Total rows with pemakaian: ${count}`);
    console.log("Sample data:", JSON.stringify(data, null, 2));
  }

  console.log("\nChecking 'tindakan_medik' table (legacy)...");
  const { data: legacyData, error: legacyError, count: legacyCount } = await supabase
    .from("tindakan_medik")
    .select("id, pemakaian, tanggal", { count: "exact" })
    .not("pemakaian", "is", null)
    .neq("pemakaian", "")
    .limit(5);

  if (legacyError) {
    console.log("tindakan_medik table might not exist or error:", legacyError.message);
  } else {
    console.log(`Total legacy rows with pemakaian: ${legacyCount}`);
    console.log("Sample legacy data:", JSON.stringify(legacyData, null, 2));
  }
}

checkDb();

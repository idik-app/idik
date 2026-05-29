import { resolvePasienFromRow, mapApiPasienRow } from "../app/dashboard/layanan/tindakan/lib/displayTindakanRow.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  // 1. Fetch patients exactly like /api/pasien?compact=1
  const firstRes = await supabase
    .from("pasien")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 1999);
  
  const pasienRaw = firstRes.data || [];
  const pasienOptions = pasienRaw
    .map(r => mapApiPasienRow(r))
    .filter(Boolean);

  // 2. Fetch SAMSUL's tindakan row
  const { data: tindList } = await supabase
    .from("tindakan")
    .select("*")
    .eq("no_rm", "924820");

  const rawRow = tindList[0];

  console.log("Raw tindakan row:", {
    id: rawRow.id,
    no_rm: rawRow.no_rm,
    nama_pasien: rawRow.nama_pasien,
    pasien_id: rawRow.pasien_id
  });

  // Test resolution
  const resolved = resolvePasienFromRow(pasienOptions, rawRow);
  console.log("Resolved patient:", resolved);

  // If not resolved, let's debug why:
  if (!resolved) {
    const pid = String(rawRow.pasien_id ?? "").trim();
    console.log("pid:", JSON.stringify(pid));

    const findById = pasienOptions.find(p => String(p.id) === pid);
    console.log("findById in options:", findById);

    // Let's check how many options exist, and if 1859 is there:
    const option1859 = pasienOptions.find(p => String(p.id) === "1859");
    console.log("option1859 in options:", option1859);
  }
}

test();

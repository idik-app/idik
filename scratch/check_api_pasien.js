import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const fetchUrl = "https://whbinarvynbyemvqbfjg.supabase.co"; // wait, let's just use the Supabase client directly to mimic the API
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Query Supabase directly exactly as /api/pasien does
  const limit = 5000;
  const firstRes = await supabase
    .from("pasien")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 999);
  
  const secondRes = await supabase
    .from("pasien")
    .select("*")
    .order("created_at", { ascending: false })
    .range(1000, 1999);

  const all = [...(firstRes.data || []), ...(secondRes.data || [])];
  console.log("Total fetched in two chunks:", all.length);

  const samsul = all.find(p => p.no_rm === "924820");
  console.log("Samsul in all fetched list:", samsul);
}

check();

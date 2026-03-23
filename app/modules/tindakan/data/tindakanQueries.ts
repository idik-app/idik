import { supabase } from "@/core/services/supabaseClient";

export async function getAllTindakan() {
  return supabase
    .from("tindakan_medik")
    .select("*")
    .order("tanggal", { ascending: false });
}

"use server";

import { createClient } from "@/lib/supabase/server";

export async function getData(table: string, limit = 100) {
  const supabase = createClient();
  const { data, error } = await supabase.from(table).select("*").limit(limit);

  if (error) {
    console.error("❌ getData error:", error.message);
    return [];
  }
  return data;
}

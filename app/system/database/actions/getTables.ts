"use server";

import { createClient } from "@supabase/supabase-js";

export async function getTables() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .order("table_name");

    if (error) throw error;

    return {
      success: true,
      tables: data.map((t) => t.table_name),
      lastSync: new Date().toLocaleString("id-ID"),
    };
  } catch (err: any) {
    return { success: false, message: err.message || "Connection failed" };
  }
}

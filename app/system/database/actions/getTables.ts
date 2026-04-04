"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getTables() {
  try {
    const supabase = createAdminClient(true);

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

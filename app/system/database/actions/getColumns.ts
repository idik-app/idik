"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getColumns(tableName: string) {
  try {
    const supabase = createAdminClient(true);

    // ambil struktur kolom
    const { data: columns, error: errCols } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable, column_default")
      .eq("table_schema", "public")
      .eq("table_name", tableName)
      .order("ordinal_position");

    if (errCols) throw errCols;

    // ambil sampel data
    const { data: sample, error: errSample } = await supabase
      .from(tableName)
      .select("*")
      .limit(100);

    if (errSample) throw errSample;

    return { success: true, columns, sample };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to fetch schema" };
  }
}

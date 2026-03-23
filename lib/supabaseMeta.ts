import { supabase } from "@/lib/supabaseClient";

export async function getTables() {
  const { data, error } = await supabase.rpc("list_tables");

  if (error) {
    console.error("Supabase RPC error:", error);
    throw error;
  }

  console.log("Tables:", data);
  return data;
}

export async function getColumns(table: string) {
  const { data, error } = await (supabase as any).rpc("list_columns", {
    table_name: table,
  });

  if (error) {
    console.error("Supabase getColumns error:", error);
    throw error;
  }

  console.log(`Columns for ${table}:`, data);
  return data;
}

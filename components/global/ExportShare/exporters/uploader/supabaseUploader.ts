"use client";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadToSupabase(
  type: string,
  fileBlob: Blob,
  filename: string
) {
  try {
    const { data, error } = await supabase.storage
      .from("idik_exports") // bucket “idik_exports”
      .upload(`${type}/${filename}`, fileBlob, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("idik_exports")
      .getPublicUrl(`${type}/${filename}`);

    return urlData.publicUrl;
  } catch (err) {
    console.error("Upload gagal:", err);
    return null;
  }
}

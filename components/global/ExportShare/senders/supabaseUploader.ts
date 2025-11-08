"use client";

import { getSafeSupabase } from "@/lib/safeSupabase";

/**
 * Upload file ke Supabase (otomatis skip jika offline)
 */
export async function uploadToSupabase(type: string, file: File) {
  const supabase = getSafeSupabase();

  // 📴 Mode offline → skip upload
  if (!supabase) {
    console.log(`📁 [Offline Mode] Upload ${file.name} diabaikan.`);
    return {
      publicUrl: null,
      message: "Supabase offline — upload diabaikan.",
    };
  }

  try {
    const fileName = `${type}/${Date.now()}-${file.name}`;

    // 🔸 Upload file ke bucket "uploads"
    const { error } = await supabase.storage
      .from("uploads")
      .upload(fileName, file);

    if (error) throw error;

    // 🔹 Ambil URL publik file
    const { data: publicData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    return {
      publicUrl: publicData.publicUrl,
      message: "✅ Upload berhasil.",
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("❌ Gagal upload:", errorMessage);

    return {
      publicUrl: null,
      message: "Upload gagal.",
      error: errorMessage,
    };
  }
}

import { supabase } from "./supabaseClient"
import { formatTanggal, truncateText } from "./utils"

// Ambil 3 berita terbaru
export async function getBeritaTerbaru(limit = 3) {
  const { data, error } = await supabase
    .from("berita")
    .select("*")
    .eq("status", "publish")
    .order("tanggal", { ascending: false })
    .limit(limit)

  if (error) throw error

  return data.map((item) => ({
    ...item,
    tanggalFormatted: formatTanggal(item.tanggal),
    cuplikan: truncateText(item.isi, 120),
  }))
}

// Ambil semua berita
export async function getSemuaBerita() {
  const { data, error } = await supabase
    .from("berita")
    .select("*")
    .eq("status", "publish")
    .order("tanggal", { ascending: false })

  if (error) throw error

  return data.map((item) => ({
    ...item,
    tanggalFormatted: formatTanggal(item.tanggal),
    cuplikan: truncateText(item.isi, 180),
  }))
}

// Ambil berita detail berdasarkan slug
export async function getBeritaBySlug(slug: string) {
  const { data, error } = await supabase
    .from("berita")
    .select("*")
    .eq("slug", slug)
    .single()

  if (error) throw error

  return {
    ...data,
    tanggalFormatted: formatTanggal(data.tanggal),
  }
}

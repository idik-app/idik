import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("berita")
      .select("id, judul, isi, tanggal, gambar_url, kategori, slug, created_at")
      .eq("status", "publish")
      .order("tanggal", { ascending: false })
      .limit(6)

    if (error) throw error

    const now = new Date()
    const hasil = data.map((item) => {
      const tanggalObj = new Date(item.tanggal)
      const isBaru = (now.getTime() - tanggalObj.getTime()) / (1000 * 3600 * 24) < 7
      return {
        ...item,
        tanggalFormatted: tanggalObj.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        cuplikan: item.isi.length > 120 ? item.isi.slice(0, 120) + "..." : item.isi,
        isBaru,
      }
    })

    return NextResponse.json(hasil)
  } catch (err: any) {
    console.error("API Error:", err.message)
    return NextResponse.json({ error: "Gagal mengambil berita" }, { status: 500 })
  }
}

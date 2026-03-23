/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ PENTING: Tambahkan transpilePackages untuk mengatasi masalah bundling/$$typeof.
  // Next.js akan memproses library ini seolah-olah mereka adalah bagian dari kode Anda sendiri.
  transpilePackages: ["@react-spring/web", "framer-motion", "recharts"],

  // Mode Strict React
  reactStrictMode: true,

  // ✅ Supabase SSR: gunakan opsi stabil untuk paket eksternal
  serverExternalPackages: ["@supabase/ssr"],

  // ✅ Konfigurasi gambar
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "192.168.1.12" },
      // Pastikan untuk mengganti placeholder ini dengan hostname Supabase yang sebenarnya
      { protocol: "https", hostname: "whbinarvynbyemvqbfjg.supabase.co" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // ⚠️ IGNORE: Sebaiknya dinonaktifkan di Production
  // Ini mengabaikan build errors ringan (TS/ESLint)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // ❌ DIHAPUS: Next.js sudah secara otomatis menangani variabel yang diawali NEXT_PUBLIC_
  // sehingga properti env tidak lagi diperlukan di sini.

  trailingSlash: false,
};

export default nextConfig;

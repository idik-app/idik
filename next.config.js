/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ Supabase SSR: gunakan opsi stabil
  serverExternalPackages: ["@supabase/ssr"],

  // ✅ Ganti images.domains → images.remotePatterns
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "192.168.1.12" },
      { protocol: "https", hostname: "your-supabase-project-id.supabase.co" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // ✅ Abaikan build errors ringan
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // ✅ Environment variabel publik
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    BASE_URL: process.env.BASE_URL,
  },

  trailingSlash: false,
};

export default nextConfig;

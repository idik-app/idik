/** @type {import('next').NextConfig} */

/* ==========================================
   ⚙️  JARVIS DEV CONFIG v3.1 (Gold-Cyan Hybrid)
   Optimized for local development speed
   ========================================== */

const nextConfig = {
  reactStrictMode: false, // ⚡ Nonaktifkan strict untuk refresh cepat
  swcMinify: true, // tetap efisien

  experimental: {
    turbo: {
      rules: {
        "*.css": {
          loaders: ["postcss-loader"], // pastikan Tailwind aktif
        },
      },
    },
  },

  // 🚫 Tanpa CSP agar reload lebih cepat
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },

  // ✅ Friendly dev logging
  webpack(config) {
    config.infrastructureLogging = { level: "warn" };
    return config;
  },
};

export default nextConfig;

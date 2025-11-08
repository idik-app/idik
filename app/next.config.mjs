/** @type {import('next').NextConfig} */
import bundleAnalyzer from "@next/bundle-analyzer";

/* ==========================================
   ⚙️  JARVIS HYBRID NEXT CONFIG v3.1
   Optimized for Tailwind + Turbopack
   ========================================== */

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/* 🧩 Content Security Policy (CSP) */
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https:;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self' https:;
  font-src 'self' data:;
`;

/* 🚀 Next.js Config */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    turbo: {
      // Ensure TailwindCSS + PostCSS are processed correctly under Turbopack
      rules: {
        "*.css": {
          loaders: ["postcss-loader"],
        },
      },
    },
  },

  // ✅ Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy.replace(/\s{2,}/g, " ").trim(),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  /* ⚡ Bundle Analyzer toggle
     Jalankan: ANALYZE=true npm run build */
  webpack(config) {
    return config;
  },
};

/* 🧠 Export Final Hybrid Configuration */
export default withBundleAnalyzer(nextConfig);

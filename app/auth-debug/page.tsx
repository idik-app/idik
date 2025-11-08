"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthDebugPage() {
  const [status, setStatus] = useState("🔄 Memeriksa koneksi Supabase...");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Cek koneksi Supabase URL & Key
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key =
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10) + "...";

        // Cek session aktif
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          setStatus("❌ Gagal mengambil session Supabase");
          setData({ error: error.message, url, key });
        } else if (!session) {
          setStatus("⚠️ Tidak ada session aktif (belum login)");
          setData({ url, key });
        } else {
          setStatus("✅ Session aktif, koneksi Supabase normal");
          setData({
            url,
            key,
            user: session.user.email,
            exp: new Date(session.expires_at * 1000).toLocaleString(),
          });
        }
      } catch (err: any) {
        setStatus("💥 Terjadi kesalahan koneksi Supabase");
        setData({ error: err.message });
      }
    };

    checkAuth();
  }, []);

  return (
    <div
      style={{
        background: "#0a0f18",
        color: "#0ff",
        fontFamily: "monospace",
        padding: "2rem",
        borderRadius: "12px",
        border: "1px solid #0ff3",
        maxWidth: "800px",
        margin: "2rem auto",
      }}
    >
      <h2>🧠 Auth Debug – IDIK-App</h2>
      <p style={{ color: "#ff9" }}>{status}</p>

      <pre
        style={{
          background: "#111a2a",
          padding: "1rem",
          borderRadius: "8px",
          overflowX: "auto",
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>

      <p style={{ fontSize: "0.8rem", color: "#888" }}>
        ⏱ Refresh halaman untuk memperbarui status session.
      </p>
    </div>
  );
}

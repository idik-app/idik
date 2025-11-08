"use server";

/**
 * 🔒 runQuery – Universal Database Gateway
 * Semua query SQL dikirim lewat endpoint API agar aman dari sisi klien.
 * Gunakan untuk SELECT, INSERT, UPDATE, DELETE yang terverifikasi.
 */

export async function runQuery(sql: string) {
  if (!sql || typeof sql !== "string") {
    return { error: "Invalid query string", data: null };
  }

  try {
    const res = await fetch("/api/database/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} – ${res.statusText}`);
    }

    const json = await res.json();
    if (json.error) {
      console.error("❌ runQuery error:", json.error);
      return { error: json.error, data: null };
    }

    return { data: json.data, error: null };
  } catch (err: any) {
    console.error("❌ runQuery exception:", err.message);
    return { error: err.message, data: null };
  }
}

import { NextResponse } from "next/server";

/**
 * GET /api/system/diagnostics — status Autonomous tanpa client-only code.
 * Supervisor berjalan di client (layout); di sini hanya return payload server-safe.
 */
function isSupabaseLocal(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname === "127.0.0.1" || u.hostname === "localhost";
  } catch {
    return false;
  }
}

export async function GET() {
  const issues: string[] = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const mode = isSupabaseLocal(supabaseUrl) ? "local" : "remote";

  if (!supabaseUrl) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL tidak diset");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY tidak diset");
  }

  return NextResponse.json({
    ok: issues.length === 0,
    autonomous: true,
    supervisor: "client_init",
    issues,
    supabase: { url: supabaseUrl || null, mode },
    timestamp: new Date().toISOString(),
  });
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/guards";

/** Lazy init agar build tidak gagal bila env belum terset di lingkungan build. */
let supabaseClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseKey = serviceKey || anonKey;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "❌ Supabase URL atau Key belum diisi (NEXT_PUBLIC_SUPABASE_URL + service/anon key)"
    );
  }
  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

// ✅ Global logs cache (persist antar-request di dev)
declare global {
  var logs: string[] | undefined;
}
const logs = globalThis.logs || [];
globalThis.logs = logs;

// ✅ GET → ambil log sementara
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  return Response.json({ logs });
}

// ✅ POST → catat log baru + simpan ke Supabase
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  try {
    const { level = "info", message = "", meta = {} } = await req.json();
    if (!message) {
      return Response.json(
        { ok: false, error: "Message kosong" },
        { status: 400 }
      );
    }

    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] [${level.toUpperCase()}] ${message}`;

    logs.push(entry);
    if (logs.length > 500) logs.splice(0, logs.length - 250);

    // ✅ Insert ke Supabase
    const { error } = await getSupabase().from("logs").insert({
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
    });

    if (error) console.error("Supabase insert error:", error.message);

    return Response.json({ ok: true, stored: !error });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid request";
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }
}

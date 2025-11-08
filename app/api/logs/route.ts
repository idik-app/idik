import { createClient } from "@supabase/supabase-js";

// ✅ Ambil environment variabel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ✅ Pilih kunci yang tersedia (prioritas: service → anon)
const supabaseKey = serviceKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("❌ Supabase URL atau Key belum diisi di .env.local");
}

// ✅ Inisialisasi Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ Global logs cache (persist antar-request di dev)
declare global {
  var logs: string[] | undefined;
}
const logs = globalThis.logs || [];
globalThis.logs = logs;

// ✅ GET → ambil log sementara
export async function GET() {
  return Response.json({ logs });
}

// ✅ POST → catat log baru + simpan ke Supabase
export async function POST(req: Request) {
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
    const { error } = await supabase.from("logs").insert({
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

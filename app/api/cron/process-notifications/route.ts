import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 🚀 GET /api/cron/process-notifications
 * Vercel Cron Job to process the distributor_notification_outbox queue.
 * Parses events (MUTASI_STOK, LOW_STOCK, PRODUCT_DELETED), checks distributor
 * notification preferences, pushes in-app notifications, and logs process status.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    // Secure Cron Job: verify cron secret token if set in environment
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized cron execution key" },
        { status: 401 }
      );
    }

    const supabase = createAdminClient(true);
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Supabase admin client not initialized" },
        { status: 500 }
      );
    }

    // 1. Fetch unprocessed outbox items
    const { data: outboxItems, error: fetchErr } = await supabase
      .from("distributor_notification_outbox")
      .select("*")
      .is("processed_at", null)
      .lt("attempts", 5) // Retry up to 5 times
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchErr) throw fetchErr;

    const items = outboxItems || [];
    if (items.length === 0) {
      return NextResponse.json({ ok: true, message: "No pending notifications to process" });
    }

    const results = [];

    // 2. Process each notification outbox item
    for (const item of items) {
      try {
        const payload = item.payload || {};
        const eventType = item.event_type;
        const distId = item.distributor_id;

        // Fetch settings
        const { data: settings } = await supabase
          .from("distributor_notification_settings")
          .eq("distributor_id", distId)
          .maybeSingle();

        let shouldNotify = false;
        let messageText = "";

        if (eventType === "LOW_STOCK") {
          // If low stock alert is enabled
          shouldNotify = settings?.low_stock_enabled !== false;
          messageText = `⚠️ Peringatan Stok Menipis! Produk [${payload.nama_barang || "Alkes"}] saat ini hanya tersisa ${payload.stok_setelah || 0} (Batas minimum: ${payload.min_stok || 0}).`;
        } else if (eventType === "MUTASI_STOK") {
          // If real-time mutasi is enabled
          shouldNotify = settings?.realtime_enabled !== false;
          messageText = `📦 Mutasi Stok Baru: Produk [${payload.nama_barang || "Alkes"}] mengalami perubahan ${payload.qty_delta > 0 ? "+" : ""}${payload.qty_delta || 0} (${payload.tipe || "KOREKSI"}). Sisa stok: ${payload.stok_setelah || 0}.`;
        } else if (eventType === "PRODUCT_DELETED") {
          // Product deleted/unmapped always triggers notification
          shouldNotify = true;
          messageText = `❌ Katalog Produk Dicabut: Mapping untuk produk [${payload.nama_barang || "Alkes"}] telah dicabut/dihapus oleh RS atau distributor.`;
        }

        if (shouldNotify && messageText) {
          // 3. Push to in-app notifications
          const { error: notifErr } = await supabase
            .from("notifications")
            .insert({
              message: messageText,
              type: eventType === "LOW_STOCK" ? "warning" : "info"
            });

          if (notifErr) throw notifErr;

          // 4. Simulate email dispatch
          const recipients = settings?.email_recipients || [];
          if (recipients.length > 0) {
            console.log(`[EMAIL DISPATCH MOCK] Sent to: ${recipients.join(", ")} | Content: ${messageText}`);
          }
        }

        // 5. Mark as processed successfully
        const { error: updateErr } = await supabase
          .from("distributor_notification_outbox")
          .update({
            processed_at: new Date().toISOString(),
            attempts: item.attempts + 1
          })
          .eq("id", item.id);

        if (updateErr) throw updateErr;

        results.push({ id: item.id, status: "PROCESSED", notified: shouldNotify });
      } catch (err: any) {
        console.error(`❌ Error processing notification ${item.id}:`, err);
        
        // Log failure in outbox
        await supabase
          .from("distributor_notification_outbox")
          .update({
            attempts: item.attempts + 1,
            error_log: err instanceof Error ? err.message : String(err)
          })
          .eq("id", item.id);

        results.push({ id: item.id, status: "FAILED", error: String(err) });
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, details: results });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("❌ GET /api/cron/process-notifications:", errorMsg);
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}

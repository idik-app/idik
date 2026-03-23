"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/*───────────────────────────────────────────────
🧩 DashboardClient v2.1 – Supabase Global Integration
───────────────────────────────────────────────*/
export default function DashboardClient() {
  const [status, setStatus] = useState("Loading Supabase...");

  useEffect(() => {
    async function checkConnection() {
      const { data, error } = await supabase
        .from("pasien")
        .select("id")
        .limit(1);
      if (error) setStatus(`❌ Connection error: ${error.message}`);
      else setStatus("✅ Supabase Connected");
    }
    checkConnection();
  }, []);

  return (
    <div className="p-4 text-cyan-300 text-sm">
      <p>{status}</p>
    </div>
  );
}

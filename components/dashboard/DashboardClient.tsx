// 📁 components/dashboard/DashboardClient.tsx
"use client";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function DashboardClient() {
  const supabase = createBrowserClientInstance();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("doctor")
      .select("*")
      .then(({ data }) => setData(data || []));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-cyan-300 font-bold">Dashboard JARVIS (Client)</h2>
      <pre className="text-xs text-gray-400">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

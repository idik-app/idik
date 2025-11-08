"use client";
import { useEffect, useState } from "react";
import DashboardMain from "@/components/dashboard/DashboardMain";

export default function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/supabase")
      .then((res) => res.json())
      .then(({ data }) => setData(data))
      .catch(console.error);
  }, []);

  if (!data)
    return (
      <div className="p-8 text-cyan-400 animate-pulse">
        Loading dashboard...
      </div>
    );

  return <DashboardMain stats={data} />;
}

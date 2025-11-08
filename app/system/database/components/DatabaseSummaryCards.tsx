"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Database, Server, ShieldCheck } from "lucide-react";

export default function DatabaseSummaryCards({
  connected,
  loading,
  count,
}: {
  connected: boolean;
  loading: boolean;
  count: number;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3 mb-10">
      <Card className="bg-[#0f1629]/80 border border-cyan-800/30 rounded-2xl shadow-lg hover:shadow-cyan-800/30 transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Server className="text-cyan-400" size={36} />
            <span className="text-cyan-300 text-sm font-semibold">
              Supabase
            </span>
          </div>
          <h2 className="text-3xl font-bold mt-4 text-gray-100">
            {connected ? "Connected" : "Offline"}
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            Realtime sync {connected ? "active" : "paused"}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-[#0f1629]/80 border border-yellow-700/30 rounded-2xl shadow-lg hover:shadow-yellow-800/30 transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <ShieldCheck className="text-yellow-400" size={36} />
            <span className="text-yellow-300 text-sm font-semibold">
              Security
            </span>
          </div>
          <h2 className="text-3xl font-bold mt-4 text-gray-100">Encrypted</h2>
          <p className="text-gray-400 text-sm mt-2">Role-based access (RBAC)</p>
        </CardContent>
      </Card>

      <Card className="bg-[#0f1629]/80 border border-emerald-700/30 rounded-2xl shadow-lg hover:shadow-emerald-800/30 transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Database className="text-emerald-400" size={36} />
            <span className="text-emerald-300 text-sm font-semibold">
              Tables
            </span>
          </div>
          <h2 className="text-3xl font-bold mt-4 text-gray-100">
            {loading ? "…" : count}
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            Auto-indexed for performance
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

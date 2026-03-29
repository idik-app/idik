"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Database,
  Columns3,
  RefreshCcw,
  Table as TableIcon,
  Terminal,
  Play,
  Clock,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export default function TableDetailPage() {
  const { table } = useParams();
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"data" | "sql">("data");

  const [query, setQuery] = useState(`SELECT * FROM ${table} LIMIT 10;`);
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  async function fetchTableData() {
    setLoading(true);
    try {
      // ambil metadata kolom (gunakan schema information_schema)
      const tableName = typeof table === "string" ? table : Array.isArray(table) ? table[0] : "";
      const { data: colData, error: colError } = await (supabase as any)
        .from("information_schema.columns")
        .select("column_name, data_type, is_nullable")
        .eq("table_name", tableName)
        .limit(50);

      if (!colError) {
        setColumns(
          colData?.map((c: any) => ({
            name: c.column_name,
            type: c.data_type,
            nullable: c.is_nullable === "YES",
          })) ?? []
        );
      }

      // ambil isi tabel
      const { data: rowsData, error: rowsError } = await (supabase as any)
        .from(tableName)
        .select("*")
        .limit(50);

      if (!rowsError) setRows(rowsData ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function runSQL() {
    setQueryError(null);
    setQueryResult([]);
    try {
      const { data, error } = await (supabase as any).rpc("exec_sql", { query });
      if (error) throw error;
      setQueryResult(data ?? []);
      saveHistory(query);
    } catch (err: any) {
      setQueryError(err.message);
    }
  }

  function saveHistory(sql: string) {
    const updated = [sql, ...history.filter((q) => q !== sql)].slice(0, 10);
    setHistory(updated);
    localStorage.setItem("sql_history", JSON.stringify(updated));
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem("sql_history");
  }

  useEffect(() => {
    const stored = localStorage.getItem("sql_history");
    if (stored) setHistory(JSON.parse(stored));
    fetchTableData();
  }, [table]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-full min-w-0 bg-gradient-to-b from-[#0a0f1e] to-[#0b1a2a] text-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-cyan-700/30 pb-4">
        <div className="flex items-center gap-3">
          <Database className="text-cyan-400" size={28} />
          <h1 className="text-2xl font-semibold text-cyan-300 tracking-wide">
            Table: {table}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/system/database">
            <Button
              variant="outline"
              className="border-cyan-600/50 text-cyan-300 hover:bg-cyan-900/30"
            >
              <ArrowLeft size={16} className="mr-2" /> Back
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={fetchTableData}
            className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/30"
          >
            <RefreshCcw size={16} className="mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-cyan-800/30 pb-2">
        <button
          onClick={() => setActiveTab("data")}
          className={`px-3 py-2 rounded-t-md ${
            activeTab === "data"
              ? "bg-cyan-900/30 text-cyan-300 border-b-2 border-cyan-400"
              : "text-gray-400 hover:text-cyan-200"
          }`}
        >
          <TableIcon size={16} className="inline mr-1" /> Data
        </button>
        <button
          onClick={() => setActiveTab("sql")}
          className={`px-3 py-2 rounded-t-md ${
            activeTab === "sql"
              ? "bg-cyan-900/30 text-cyan-300 border-b-2 border-cyan-400"
              : "text-gray-400 hover:text-cyan-200"
          }`}
        >
          <Terminal size={16} className="inline mr-1" /> SQL Console
        </button>
      </div>

      {/* Content */}
      {activeTab === "data" ? (
        loading ? (
          <div className="text-center text-gray-400 animate-pulse mt-20">
            Loading table data…
          </div>
        ) : (
          <>
            {/* Metadata cards */}
            <div className="grid gap-6 md:grid-cols-2 mb-10">
              <Card className="bg-[#0f1629]/80 border border-cyan-800/30 rounded-2xl shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Columns3 className="text-cyan-400" size={30} />
                    <span className="text-cyan-300 text-sm font-semibold">
                      Columns
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-gray-300">
                    {columns.map((col) => (
                      <li key={col.name} className="flex justify-between">
                        <span>{col.name}</span>
                        <span className="text-gray-500">{col.type}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-[#0f1629]/80 border border-cyan-800/30 rounded-2xl shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TableIcon className="text-emerald-400" size={30} />
                    <span className="text-emerald-300 text-sm font-semibold">
                      Records
                    </span>
                  </div>
                  <h2 className="text-4xl font-bold text-gray-100">
                    {rows.length}
                  </h2>
                  <p className="text-gray-400 text-sm mt-2">
                    Showing 50 most recent rows
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Data Table */}
            <div className="bg-[#0d1424]/70 border border-cyan-800/20 rounded-2xl overflow-x-auto shadow-lg">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-[#101a30]/70 text-cyan-300 uppercase text-xs tracking-wide">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.name} className="px-4 py-2 text-left">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-800/20">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-cyan-900/10">
                      {columns.map((col) => (
                        <td
                          key={col.name}
                          className="px-4 py-2 text-gray-300 whitespace-nowrap"
                        >
                          {String(row[col.name] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : (
        /* SQL console */
        <div className="space-y-6">
          <Card className="bg-[#0d1424]/70 border border-cyan-800/20 rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex justify-between mb-3">
                <label className="block text-sm text-cyan-300">
                  SQL Query Editor
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-gray-300 border-cyan-700/50 hover:bg-cyan-900/30"
                  onClick={clearHistory}
                >
                  <Trash2 size={14} className="mr-1" /> Clear History
                </Button>
              </div>

              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={6}
                spellCheck={false}
                className="w-full bg-[#081020] text-gray-100 border border-cyan-700/40 rounded-lg p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />

              <Button
                onClick={runSQL}
                className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
              >
                <Play size={16} className="mr-2" /> Run Query
              </Button>

              {queryError && (
                <div className="mt-4 text-red-400 text-sm font-mono">
                  Error: {queryError}
                </div>
              )}
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card className="bg-[#0f1629]/70 border border-cyan-800/20 rounded-2xl shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-cyan-300 font-semibold text-sm flex items-center">
                    <Clock size={16} className="mr-2" /> Query History
                  </h3>
                </div>
                <ul className="space-y-2 text-sm font-mono">
                  {history.map((h, i) => (
                    <li
                      key={i}
                      className="p-2 bg-[#0a1325]/70 rounded-lg hover:bg-cyan-900/20 cursor-pointer transition"
                      onClick={() => setQuery(h)}
                    >
                      {h}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {queryResult.length > 0 && (
            <div className="bg-[#0d1424]/70 border border-cyan-800/20 rounded-2xl overflow-x-auto shadow-lg p-4">
              <h3 className="text-cyan-300 font-semibold mb-2 text-sm">
                Query Result ({queryResult.length} rows)
              </h3>
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-[#101a30]/70 text-cyan-300 uppercase text-xs tracking-wide">
                  <tr>
                    {Object.keys(queryResult[0] || {}).map((col) => (
                      <th key={col} className="px-4 py-2 text-left">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-800/20">
                  {queryResult.map((row, i) => (
                    <tr key={i} className="hover:bg-cyan-900/10">
                      {Object.keys(row).map((col) => (
                        <td
                          key={col}
                          className="px-4 py-2 text-gray-300 whitespace-nowrap"
                        >
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

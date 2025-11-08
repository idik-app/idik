"use client";

import { useState, useEffect } from "react";

export function useDatabaseFetch() {
  const [tables, setTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [sample, setSample] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string>("—");

  // ✅ Otomatis fetch daftar tabel saat halaman pertama kali dimuat
  useEffect(() => {
    fetchTables();
  }, []);

  // 🔹 Ambil daftar tabel dari API Supabase
  async function fetchTables() {
    setLoadingTables(true);
    try {
      const res = await fetch("/api/database/tables");
      const data = await res.json();

      if (data.ok) {
        setTables(data.tables ?? []);
        setConnected(true);
        setLastSync(data.lastSync);
        localStorage.setItem("tablesCache", JSON.stringify(data.tables ?? []));
        console.log("✅ Tables loaded:", data.tables);
      } else {
        setConnected(false);
        const cache = localStorage.getItem("tablesCache");
        setTables(cache ? JSON.parse(cache) : []);
      }
    } catch (err) {
      console.error("❌ Fetch tables error:", err);
      setConnected(false);
      const cache = localStorage.getItem("tablesCache");
      setTables(cache ? JSON.parse(cache) : []);
    }
    setLoadingTables(false);
  }

  // 🔹 Ambil struktur kolom dan sampel data dari tabel terpilih
  async function fetchSchema(tableName: string) {
    setSelectedTable(tableName);
    setLoadingSchema(true);
    try {
      const res = await fetch("/api/database/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: tableName }),
      });
      const data = await res.json();

      if (data.ok) {
        setColumns(data.columns ?? []);
        setSample(data.sample ?? []);
        console.log("📊 Schema fetched for:", tableName);
      } else {
        setColumns([]);
        setSample([]);
      }
    } catch (err) {
      console.error("❌ Fetch schema error:", err);
      setColumns([]);
      setSample([]);
    }
    setLoadingSchema(false);
  }

  return {
    tables,
    columns,
    sample,
    selectedTable,
    setSelectedTable,
    loadingTables,
    loadingSchema,
    connected,
    fetchTables,
    fetchSchema,
    lastSync,
  };
}

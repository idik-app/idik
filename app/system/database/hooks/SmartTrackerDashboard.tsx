// ✅ D:\idik-app\app\dashboard\database\hooks\useDatabaseFetch.ts
"use client";

import { useState, useEffect } from "react";
import { getTables } from "../actions"; // pastikan ada file actions.ts di folder yang sama

export interface TableItem {
  name: string;
  count: number;
  updated_at: string;
  status: string;
}

export function useDatabaseFetch() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // mencegah update state setelah unmount

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await getTables();

        if (isMounted) {
          if (Array.isArray(data)) {
            setTables(data);
          } else {
            console.error("Invalid response from getTables:", data);
            setError("Respons tidak valid dari server.");
            setTables([]);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Gagal mengambil data:", err);
          setError(err.message || "Terjadi kesalahan saat memuat data.");
          setTables([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []); // ⛔ jangan isi dependency, biar tidak re-render terus

  return { tables, isLoading, error };
}

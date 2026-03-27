"use client";

import { useState, useEffect, useCallback } from "react";

export function useTindakanData() {
  const [tindakanList, setTindakanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/tindakan?limit=8000", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: unknown;
        error?: string;
      };

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Gagal mengambil data tindakan.");
      }

      const nextRows = Array.isArray(json?.data) ? json.data : [];
      setError(null);
      setTindakanList(nextRows);
    } catch (e: unknown) {
      console.error("Error load tindakan:", e);
      setError(e);
      setTindakanList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    tindakanList,
    loading,
    error,
    reload,
  };
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useTindakanData() {
  const [tindakanList, setTindakanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const silentInFlightRef = useRef(0);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent) {
      setLoading(true);
    } else {
      silentInFlightRef.current += 1;
      setIsSyncing(true);
    }

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
      if (!silent) {
        setError(e);
        setTindakanList([]);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        silentInFlightRef.current = Math.max(0, silentInFlightRef.current - 1);
        if (silentInFlightRef.current === 0) {
          setIsSyncing(false);
        }
      }
    }
  }, []);

  /** Langsung hilangkan baris di UI setelah hapus sukses — mengatasi gagal reload senyap / race. */
  const removeLocalById = useCallback((id: string) => {
    const idStr = String(id ?? "").trim();
    if (!idStr) return;
    setTindakanList((prev) =>
      Array.isArray(prev)
        ? prev.filter((r) => String(r?.id ?? "").trim() !== idStr)
        : prev,
    );
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    tindakanList,
    loading,
    error,
    reload,
    removeLocalById,
    /** True saat muat ulang senyap (polling / simpan) sedang berjalan. */
    isSyncing,
  };
}

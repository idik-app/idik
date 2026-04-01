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
      const res = await fetch("/api/tindakan?limit=20000", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: unknown;
        error?: string;
        message?: string;
      };
      const dataField = (json as { data?: unknown })?.data;
      const isSuccessPayload =
        json?.ok === true || (res.ok && Array.isArray(dataField));

      if (!res.ok || !isSuccessPayload) {
        const msg =
          json?.error ||
          json?.message ||
          (res.status ? `HTTP ${res.status}` : "") ||
          "Gagal mengambil data tindakan.";
        throw new Error(msg);
      }

      const nextRows = Array.isArray(dataField) ? dataField : [];
      setError(null);
      setTindakanList(nextRows);
    } catch (e: unknown) {
      if (!silent) {
        console.error("Error load tindakan:", e);
      } else {
        // Reload senyap dipakai saat autosave/polling; hindari spam error console.
        console.warn("Reload tindakan senyap gagal:", e);
      }
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

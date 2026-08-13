"use client";

import useSWR from "swr";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

const FETCH_TIMEOUT_MS = 60_000;

async function fetcher(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    return await res.json();
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error(
        "Request terlalu lama (lebih dari 60 detik). Coba muat ulang.",
      );
    }
    throw err;
  }
}

/** Batas baris default — cukup untuk filter lokal; turunkan egress vs 10k+. */
const DEFAULT_TINDAKAN_LIMIT = 2000;
/** Debounce refetch realtime (ms) — hindari burst API setelah event DB. */
const REALTIME_TINDAKAN_DEBOUNCE_MS = 20_000;

export function useTindakanData(params?: {
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}) {
  const query = useMemo(() => {
    const p = new URLSearchParams();
    const limit =
      typeof params?.limit === "number" && Number.isFinite(params.limit)
        ? Math.min(Math.max(Math.trunc(params.limit), 1), 10000)
        : DEFAULT_TINDAKAN_LIMIT;
    p.set("limit", String(limit));
    if (params?.from) p.set("from", params.from);
    if (params?.to) p.set("to", params.to);
    if (params?.search) p.set("search", params.search);
    return p.toString();
  }, [params?.from, params?.to, params?.search, params?.limit]);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `/api/tindakan?${query}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 15_000,
      keepPreviousData: true,
      // Tanpa polling — andalkan realtime + refresh manual / idle di dashboard.
      refreshInterval: 0,
    },
  );

  const [tindakanList, setTindakanList] = useState<any[]>([]);
  const lastTindakanRealtimeReloadAtRef = useRef(0);

  // Sync SWR data to local state for easier use with removeLocalById
  useEffect(() => {
    if (data?.data && Array.isArray(data.data)) {
      setTindakanList(data.data);
    } else if (data && !data.ok) {
      setTindakanList([]);
    }
  }, [data]);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    await mutate();
  }, [mutate]);

  const removeLocalById = useCallback((id: string) => {
    const idStr = String(id ?? "").trim();
    if (!idStr) return;
    setTindakanList((prev) =>
      Array.isArray(prev)
        ? prev.filter((r) => String(r?.id ?? "").trim() !== idStr)
        : prev
    );
  }, []);

  /** Tambahkan baris baru ke local state dan SWR cache secara instant */
  const addLocalRow = useCallback(
    (newRow: any) => {
      if (!newRow) return;
      setTindakanList((prev) => [newRow, ...prev]);

      // Mutate SWR cache langsung tanpa request server
      void mutate(
        (current: any) => {
          if (!current || !Array.isArray(current.data)) return current;
          return {
            ...current,
            data: [newRow, ...current.data],
          };
        },
        { revalidate: false }
      );
    },
    [mutate],
  );

  /** Gabungkan PATCH ke baris lokal agar UI (mis. kolom Time out) langsung ikut tanpa tunggu SWR. */
  const patchLocalRow = useCallback(
    (id: string, updates: Record<string, unknown>) => {
      const idStr = String(id ?? "").trim();
      if (!idStr || !updates || typeof updates !== "object") return;
      
      setTindakanList((prev) =>
        Array.isArray(prev)
          ? prev.map((r) =>
              String(r?.id ?? "").trim() === idStr ? { ...r, ...updates } : r,
            )
          : prev,
      );

      // Mutate SWR cache directly without calling the server
      void mutate(
        (current: any) => {
          if (!current || !Array.isArray(current.data)) return current;
          return {
            ...current,
            data: current.data.map((r: any) =>
              String(r?.id ?? "").trim() === idStr ? { ...r, ...updates } : r,
            ),
          };
        },
        { revalidate: false }
      );
    },
    [mutate],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ch = supabase
      .channel("tindakan-list-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tindakan" },
        () => {
          const now = Date.now();
          if (now - lastTindakanRealtimeReloadAtRef.current < REALTIME_TINDAKAN_DEBOUNCE_MS) {
            return;
          }
          lastTindakanRealtimeReloadAtRef.current = now;
          if (document.hidden) return;
          window.setTimeout(() => {
            if (document.hidden) return;
            void mutate();
          }, 1500);
        },
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(ch);
      } catch {
        /* ignore */
      }
    };
  }, [mutate]);

  return {
    tindakanList,
    loading: isLoading && tindakanList.length === 0,
    error,
    reload,
    removeLocalById,
    addLocalRow,
    patchLocalRow,
    isSyncing: isValidating,
  };
}

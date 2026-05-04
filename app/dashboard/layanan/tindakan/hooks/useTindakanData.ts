"use client";

import useSWR from "swr";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTindakanData(params?: {
  from?: string;
  to?: string;
  search?: string;
}) {
  const query = useMemo(() => {
    const p = new URLSearchParams();
    // Default limit tetap besar untuk mendukung fitur pencarian lokal di dalam hasil server
    p.set("limit", "10000");
    if (params?.from) p.set("from", params.from);
    if (params?.to) p.set("to", params.to);
    if (params?.search) p.set("search", params.search);
    return p.toString();
  }, [params?.from, params?.to, params?.search]);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `/api/tindakan?${query}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 detik
    },
  );

  const [tindakanList, setTindakanList] = useState<any[]>([]);
  const lastRealtimeReloadAtRef = useRef(0);
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
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ch = supabase
      .channel("tindakan-list-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pasien",
          filter: "id=neq.0",
        },
        () => {
          const now = Date.now();
          if (now - lastRealtimeReloadAtRef.current < 10000) return;
          lastRealtimeReloadAtRef.current = now;

          if (document.hidden) return;

          window.setTimeout(() => {
            if (document.hidden) return;
            void mutate();
          }, 2000);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tindakan" },
        () => {
          const now = Date.now();
          if (now - lastTindakanRealtimeReloadAtRef.current < 8000) return;
          lastTindakanRealtimeReloadAtRef.current = now;
          if (document.hidden) return;
          window.setTimeout(() => {
            if (document.hidden) return;
            void mutate();
          }, 1200);
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
    loading: isLoading,
    error,
    reload,
    removeLocalById,
    patchLocalRow,
    isSyncing: isValidating,
  };
}

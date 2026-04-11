"use client";

import useSWR from "swr";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTindakanData() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "/api/tindakan?limit=1000",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 detik
    }
  );

  const [tindakanList, setTindakanList] = useState<any[]>([]);
  const lastRealtimeReloadAtRef = useRef(0);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ch = supabase
      .channel("pasien-master-changes-for-tindakan")
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
        }
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
    isSyncing: isValidating,
  };
}

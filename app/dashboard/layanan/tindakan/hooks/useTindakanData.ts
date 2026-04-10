"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { runDeduped } from "@/lib/api/runDeduped";

const TINDAKAN_LIST_KEY = "GET:/api/tindakan?limit=1000";

async function fetchTindakanRowsOnce(): Promise<unknown[]> {
  const res = await fetch("/api/tindakan?limit=1000", {
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

  return Array.isArray(dataField) ? dataField : [];
}

/** Satu inflight global (runDeduped) untuk load awal — hindari duplikat antar chunk / Strict Mode. */
function fetchTindakanRowsForInitialLoad(): Promise<unknown[]> {
  return runDeduped(TINDAKAN_LIST_KEY, fetchTindakanRowsOnce);
}

export function useTindakanData() {
  const [tindakanList, setTindakanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const silentInFlightRef = useRef(0);
  const lastRealtimeReloadAtRef = useRef(0);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent) {
      setLoading(true);
    } else {
      silentInFlightRef.current += 1;
      setIsSyncing(true);
    }

    try {
      const nextRows = (await (silent
        ? fetchTindakanRowsOnce()
        : fetchTindakanRowsForInitialLoad())) as any[];
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

  // Realtime: begitu master `pasien` berubah, reload data di latar agar tabel `tindakan`
  // ikut update "silet" tanpa manual refresh.
  // (Di server, GET `/api/tindakan` memakai service role, jadi data terbaru pasti terbaca.)
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
          filter: "id=neq.0", // cegah handshake event awal
        },
        () => {
          const now = Date.now();
          // Perketat jeda reload: dari 4 detik ke 10 detik untuk menghindari waterfall request
          if (now - lastRealtimeReloadAtRef.current < 10000) return;
          lastRealtimeReloadAtRef.current = now;

          // Saat tab background, biarkan polling yang berjalan.
          if (document.hidden) return;

          // Jika reload senyap sedang berjalan, jangan tumpuk.
          if (silentInFlightRef.current > 0) return;

          // Beri jeda lebih lama agar trigger DB selesai update banyak baris.
          window.setTimeout(() => {
            if (document.hidden) return;
            if (silentInFlightRef.current > 0) return;
            void reload({ silent: true });
          }, 2000);
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

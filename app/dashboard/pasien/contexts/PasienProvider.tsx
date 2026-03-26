"use client";

import {
  createContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  reducer,
  initialState,
  type State,
  type Action,
} from "./PasienReducer";
import { calculateSummary } from "./PasienSummary";
import type { Pasien } from "../types/pasien";
import { mapFromSupabase } from "../data/pasienSchema";

function isPublicSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/*-----------------------------------------------
?? PasienProvider v6.8 � Stable Realtime Anti-Refresh Edition
- Hanya 1 kanal realtime aktif
- Filter event handshake Supabase
- Debounce dan dedup commit_timestamp
- Bersih saat unmount
-----------------------------------------------*/

export const PasienContext = createContext<
  | {
      state: State;
      dispatch: React.Dispatch<Action>;
      closeModal: () => void;
      refresh: () => Promise<void>;
    }
  | undefined
>(undefined);

export function PasienProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const closeModal = useCallback(() => {
    dispatch({ type: "CLOSE_MODAL" });
  }, []);

  /*-----------------------------------------------
   ?? Ambil data utama pasien
  -----------------------------------------------*/
  const fetchPatients = useCallback(async () => {
    if (!isPublicSupabaseConfigured()) {
      dispatch({
        type: "SET_ERROR",
        payload:
          "Supabase belum dikonfigurasi. Set `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local`, lalu restart dev server.",
      });
      dispatch({ type: "SET_LIVE", payload: false });
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      /** Sama dengan modal refresh: GET /api/pasien (service role), bukan anon ke view — hindari beda data vs edit */
      const res = await fetch("/api/pasien", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error ||
            json?.message ||
            `Gagal memuat pasien (${res.status})`
        );
      }

      const safe = (json.data || []).map((p: any) => mapFromSupabase(p)) as Pasien[];
      dispatch({ type: "SET_PATIENTS", payload: safe });
      dispatch({ type: "SET_SUMMARY", payload: calculateSummary(safe) });
      dispatch({ type: "SET_LIVE", payload: true });
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  /*-----------------------------------------------
   ?? Efek inisialisasi + sinkronisasi realtime
  -----------------------------------------------*/
  useEffect(() => {
    const configured = isPublicSupabaseConfigured();
    dispatch({ type: "SET_SCANNING", payload: false });
    if (configured) fetchPatients();

    // ---------------------------------------------
    // ?? Konfigurasi realtime stabil (anti-spam)
    // ---------------------------------------------
    let lastEventId: string | null = null;
    let lastFetch = 0;
    const minInterval = 3000; // 3 detik antar fetch

    const fetchDebounced = (payload: any) => {
      if (!configured) return;
      const now = Date.now();

      // ?? Hindari event handshake kosong
      if (!payload?.new && !payload?.old) return;

      // ?? Hindari event identik (timestamp sama)
      if (payload.commit_timestamp === lastEventId) return;
      lastEventId = payload.commit_timestamp;

      // ?? Batasi frekuensi fetch
      if (now - lastFetch < minInterval) return;
      lastFetch = now;

      console.log("?? Realtime update:", payload.eventType, payload.new?.nama);
      fetchPatients();
    };

    let cancelled = false;
    let ch: unknown = null;
    let removeChannel: ((c: unknown) => unknown) | null = null;

    if (configured) {
      void (async () => {
        try {
          const mod = await import("@/lib/supabase/supabaseClient");
          if (cancelled) return;
          const sb: any = mod.supabase as any;
          removeChannel = (c: unknown) => sb.removeChannel(c as any);
          ch = sb
            .channel("pasien-sync-stable")
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "pasien",
                filter: "id=neq.0", // cegah event handshake awal
              },
              fetchDebounced,
            )
            .subscribe((status: string) => console.log("?? Channel status:", status));
        } catch {
          /* ignore realtime */
        }
      })();
    }

    return () => {
      cancelled = true;
      try {
        if (ch && removeChannel) {
          void removeChannel(ch);
          console.log("?? Realtime channel pasien-sync-stable removed");
        }
      } catch {
        /* ignore */
      }
    };
  }, [fetchPatients]);

  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      closeModal,
      refresh: fetchPatients,
    }),
    [state, dispatch, closeModal, fetchPatients]
  );

  /*-----------------------------------------------
   ?? Provider utama
  -----------------------------------------------*/
  return (
    <PasienContext.Provider value={contextValue}>
      {children}
    </PasienContext.Provider>
  );
}

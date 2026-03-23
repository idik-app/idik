"use client";

import {
  createContext,
  useReducer,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  supabase,
  isSupabaseConfigured,
} from "@/lib/supabase/supabaseClient";
import {
  reducer,
  initialState,
  type State,
  type Action,
} from "./PasienReducer";
import { calculateSummary } from "./PasienSummary";
import type { Pasien } from "../types/pasien";
import { mapFromSupabase } from "../data/pasienSchema";

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

  const closeModal = () => dispatch({ type: "CLOSE_MODAL" });

  /*-----------------------------------------------
   ?? Ambil data utama pasien
  -----------------------------------------------*/
  const fetchPatients = async () => {
    if (!isSupabaseConfigured()) {
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

      const { data, error } = await supabase
        .from("view_pasien_full")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      const safe = (data || []).map((p: any) => mapFromSupabase(p)) as Pasien[];
      dispatch({ type: "SET_PATIENTS", payload: safe });
      dispatch({ type: "SET_SUMMARY", payload: calculateSummary(safe) });
      dispatch({ type: "SET_LIVE", payload: true });
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  /*-----------------------------------------------
   ?? Efek inisialisasi + sinkronisasi realtime
  -----------------------------------------------*/
  useEffect(() => {
    const configured = isSupabaseConfigured();
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

    const ch = configured
      ? supabase
          .channel("pasien-sync-stable")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "pasien",
              filter: "id=neq.0", // cegah event handshake awal
            },
            fetchDebounced
          )
          .subscribe((status) => console.log("?? Channel status:", status))
      : null;

    return () => {
      if (ch) {
        supabase.removeChannel(ch);
        console.log("?? Realtime channel pasien-sync-stable removed");
      }
    };
  }, []);

  /*-----------------------------------------------
   ?? Provider utama
  -----------------------------------------------*/
  return (
    <PasienContext.Provider value={{ state, dispatch, closeModal, refresh: fetchPatients }}>
      {children}
    </PasienContext.Provider>
  );
}

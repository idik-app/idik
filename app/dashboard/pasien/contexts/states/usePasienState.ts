"use client";

import { useContext } from "react";
import { PasienContext } from "../PasienProvider";

/**
 * 🧠 usePasienState v5.0 — Global Reactive State Layer
 * - Mengambil state pasien langsung dari PasienContext
 * - Tidak membuat state lokal baru agar sinkron antar-komponen
 * - Siap untuk integrasi realtime Supabase + CRUD global
 */
export function usePasienState() {
  const c = useContext(PasienContext);
  if (!c) throw new Error("usePasienState must be used within PasienProvider");
  return c.state;
}

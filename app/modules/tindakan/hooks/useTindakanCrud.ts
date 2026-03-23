// ========================================================================
// ⚡ useTindakanCrud.ts — FINAL v4.0 (SUPREME FIX)
// CRUD handler untuk tindakan (update, delete) + notifikasi
// ========================================================================

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useTindakanRealtime } from "./useTindakanRealtime";

export function useTindakanCrud() {

  // Notification system JARVIS
  const { show } = useNotification();

  // CRUD loading state
  const [loading, setLoading] = useState(false);

  // Realtime sync aktif (tidak return apa-apa, hanya hook)
  useTindakanRealtime();

  // =====================================================================
  // UPDATE
  // =====================================================================
  const updateOne = async (id: string, updates: any) => {
    setLoading(true);

    const { error } = await supabase
      .from("tindakan")
      .update(updates)
      .eq("id", id);

    setLoading(false);

    if (error) {
      show("Gagal memperbarui data tindakan");
      return false;
    }

    show("Tindakan berhasil diperbarui");
    return true;
  };

  // =====================================================================
  // DELETE
  // =====================================================================
  const deleteOne = async (id: string) => {
    setLoading(true);

    const { error } = await supabase.from("tindakan").delete().eq("id", id);

    setLoading(false);

    if (error) {
      show("Gagal menghapus tindakan");
      return false;
    }

    show("Tindakan berhasil dihapus");
    return true;
  };

  // =====================================================================
  // FINAL RETURN
  // =====================================================================
  return {
    loading,
    updateOne,
    deleteOne,
  };
}

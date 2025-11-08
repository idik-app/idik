import { useEffect, useState, useCallback } from "react";
import { getPatients } from "../actions/getPatients";
import { useNotification } from "@/app/contexts/NotificationContext";
import { Pasien } from "../types/pasien";

/* ==========================================================
   ⚙️ usePasienLoader v5.4
   - Auto load on mount
   - Manual refresh available
   - Retry safety on error
========================================================== */
export function usePasienLoader(
  setPatients: React.Dispatch<React.SetStateAction<Pasien[]>>
) {
  const { show } = useNotification();
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPatients();
      if (res.ok) {
        setPatients(res.data);
      } else {
        show({ type: "error", message: "🚫 Gagal memuat data pasien." });
      }
    } catch {
      show({ type: "warning", message: "⚠️ Koneksi tidak stabil. Coba lagi." });
    } finally {
      setLoading(false);
    }
  }, [setPatients, show]);

  // Load pertama kali
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, refresh };
}

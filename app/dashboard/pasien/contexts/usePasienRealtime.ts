"use client";
import { useEffect } from "react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { subscribePasienRealtime } from "../actions/realtime";
import { Pasien } from "../types/pasien";

export function usePasienRealtime(setPatients: (data: Pasien[]) => void) {
  const { show } = useNotification();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const init = async () => {
      unsubscribe = await subscribePasienRealtime(
        setPatients,
        (type, record) => {
          const nama = record?.nama ?? "Pasien";
          window.dispatchEvent(new Event("jarvis-realtime"));
          if (type === "INSERT")
            show({
              type: "success",
              message: `🩺 ${nama} ditambahkan (realtime).`,
            });
          if (type === "UPDATE")
            show({
              type: "info",
              message: `✏️ ${nama} diperbarui (realtime).`,
            });
          if (type === "DELETE")
            show({
              type: "warning",
              message: `🗑️ ${nama} dihapus (realtime).`,
            });
        }
      );
    };
    init();
    return () => unsubscribe && unsubscribe();
  }, [setPatients, show]);
}

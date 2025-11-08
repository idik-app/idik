"use client";
import { useEffect, useRef } from "react";

export default function TokenRefresher() {
  const failedCount = useRef(0);

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch("/api/refresh");

        if (res.ok) {
          const data = await res.json();
          if (data.refreshed) console.log("🔄 Token diperbarui otomatis");
          failedCount.current = 0; // reset jika berhasil
        } else {
          failedCount.current++;
          if (failedCount.current >= 3) {
            console.warn(
              "⚠️ Endpoint /api/refresh tidak ditemukan. Pause otomatis."
            );
            clearInterval(interval);
          }
        }
      } catch {
        failedCount.current++;
        if (failedCount.current >= 3) {
          console.warn(
            "⚠️ Refresh otomatis dihentikan sementara (network error)."
          );
          clearInterval(interval);
        }
      }
    };

    // jalankan pertama kali setelah 5 detik (biar tidak langsung spam)
    const firstTimeout = setTimeout(refresh, 5000);

    // lalu jalankan tiap 5 menit
    const interval = setInterval(refresh, 5 * 60 * 1000);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
    };
  }, []);

  return null; // tidak menampilkan apa pun
}

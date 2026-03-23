// app/core/hooks/useAppUpdate.ts
import { useEffect, useState } from "react";

export function useAppUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "NEW_VERSION_AVAILABLE") {
          setUpdateReady(true);
        }
      });
    }
  }, []);

  const updateApp = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage("SKIP_WAITING");
    }
    window.location.reload();
  };

  return { updateReady, updateApp };
}

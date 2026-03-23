import { Suspense } from "react";
import PanelReturClient from "./PanelReturClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-cyan-500/80 text-sm">
          Memuat panel retur…
        </div>
      }
    >
      <PanelReturClient />
    </Suspense>
  );
}

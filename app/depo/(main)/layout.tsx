import { Suspense } from "react";
import DepoLayoutClient from "../DepoLayoutClient";

export default function DepoMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center text-sm">
          Memuat portal Depo Farmasi…
        </div>
      }
    >
      <DepoLayoutClient>{children}</DepoLayoutClient>
    </Suspense>
  );
}

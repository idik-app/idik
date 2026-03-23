import { Suspense } from "react";
import DistributorLayoutClient from "./DistributorLayoutClient";

export default function DistributorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] text-cyan-100 flex items-center justify-center text-cyan-500/80 text-sm">
          Memuat portal distributor…
        </div>
      }
    >
      <DistributorLayoutClient>{children}</DistributorLayoutClient>
    </Suspense>
  );
}

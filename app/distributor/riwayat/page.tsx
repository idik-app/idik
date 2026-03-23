import { Suspense } from "react";
import RiwayatClient from "./RiwayatClient";

function Fallback() {
  return (
    <div className="text-[12px] text-cyan-300/70 py-6 px-1">
      Memuat retur…
    </div>
  );
}

export default function DistributorRiwayatPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <RiwayatClient />
    </Suspense>
  );
}

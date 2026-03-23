import { Suspense } from "react";
import BatalReturClient from "./BatalReturClient";

function Fallback() {
  return (
    <div className="text-[12px] text-cyan-300/70 py-6 px-1">
      Memuat panel batal retur…
    </div>
  );
}

export default function BatalReturPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <BatalReturClient />
    </Suspense>
  );
}

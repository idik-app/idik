"use client";

import dynamic from "next/dynamic";

/** Chunk terpisah + tanpa SSR — hindari Turbopack/R3F memuat React ganda. */
const Koronar3DClient = dynamic(
  () => import("@/components/cathlab/koronar3d/Koronar3DClient"),
  { ssr: false, loading: () => <KoronarShell /> }
);

function KoronarShell() {
  return (
    <div className="mx-auto flex max-w-[1600px] min-h-[320px] items-center justify-center pb-8 text-cyan-500/80">
      Memuat modul koronar…
    </div>
  );
}

export default function Koronar3DPage() {
  return (
    <div className="mx-auto max-w-[1600px] pb-8">
      <Koronar3DClient />
    </div>
  );
}

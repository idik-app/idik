"use client";

import Topbar from "@/components/Topbar";
import TabBar from "@/components/TabBar";

/* ⚙️ FixedHeader – Cathlab JARVIS Mode v6.5
   🚀 Override stacking context Framer Motion
   ✅ Selalu di atas Sidebar (global fixed)
   💠 Hologram glass gold–cyan hybrid
*/

export default function FixedHeader() {
  const topOffset = 64; // tinggi Topbar
  const tabOffset = 48; // tinggi TabBar
  const totalHeight = topOffset + tabOffset;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[1000]
                 backdrop-blur-md bg-gradient-to-r
                 from-black/85 via-black/60 to-transparent
                 border-b border-cyan-400/10 shadow-cyan-500/10"
      style={{
        height: `${totalHeight}px`,
        pointerEvents: "none", // biar tidak blok sidebar area kiri
      }}
    >
      {/* 🟦 Topbar */}
      <div
        className="relative z-[1010]
                   bg-black/60 backdrop-blur-md
                   border-b border-cyan-400/10 shadow-cyan-500/10"
        style={{
          height: `${topOffset}px`,
          pointerEvents: "auto", // aktifkan interaksi kembali
        }}
      >
        <Topbar />
      </div>

      {/* 🟩 TabBar */}
      <div
        className="relative z-[1005]
                   bg-black/40 border-b border-cyan-400/10 shadow-cyan-500/10"
        style={{
          height: `${tabOffset}px`,
          pointerEvents: "auto",
        }}
      >
        <TabBar />
      </div>
    </div>
  );
}

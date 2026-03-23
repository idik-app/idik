// dashboard.tsx
"use client";
import { HologramUI } from "../holographic/hologramUI";

export default function Dashboard() {
  return (
    <HologramUI>
      <h1 className="text-2xl font-bold text-cyan-400">
        IDIK-App Regenerative Dashboard
      </h1>
      <p className="text-gray-300">
        Sistem otonom yang belajar dan memperbaiki diri.
      </p>
    </HologramUI>
  );
}

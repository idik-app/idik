"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SummaryGrid from "./summary/SummaryGrid";
import { AIStatusPanel } from "./ai";
import { AutonomousStatusCard } from "./AutonomousStatusCard";
import ChartPatients from "./charts/ChartPatients";
import ChartDoctors from "./charts/ChartDoctors";
import ChartReuse from "./charts/ChartReuse";
import MonitorCathlab from "./monitoring/MonitorCathlab";

/*───────────────────────────────────────────────
 ⚙️ DashboardMain – Cathlab JARVIS Mode v6.0
   🔹 Sub-Navbar Gold-Cyan lokal (Dashboard / About / Analytics / Version Log)
   🔹 Struktur konten modular
   🔹 Konsisten dengan tema hologram global
───────────────────────────────────────────────*/
export default function DashboardMain() {
  const pathname = usePathname();

  const subNav = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "About / Philosophy", href: "/about" },
    { name: "Analytics", href: "/analytics" },
    { name: "Version Log", href: "/version-log" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-cyan-950 p-6 space-y-6">
      {/* 🌐 Sub-Navbar Lokal */}
      <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm font-medium tracking-wide">
        {subNav.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`transition-all duration-200 pb-[3px] ${
                active
                  ? "text-yellow-400 border-b-2 border-yellow-400"
                  : "text-cyan-300/80 hover:text-cyan-100 border-b-2 border-transparent hover:border-cyan-500/50"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* 📊 Konten utama dashboard */}
      <SummaryGrid />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AutonomousStatusCard />
        <AIStatusPanel />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <ChartPatients />
        <ChartDoctors />
        <ChartReuse />
      </div>

      <MonitorCathlab />
    </div>
  );
}

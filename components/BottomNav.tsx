"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*───────────────────────────────────────────────
 ⚙️ BottomNav – Cathlab JARVIS Mode v3.5 (Final Fix)
   🔹 z-[50]: di atas konten/header, di bawah modal (z-[9999])
   🔹 Glow neon ringan agar konsisten dengan tema
   🔹 Responsif hanya muncul di mobile (md:hidden)
───────────────────────────────────────────────*/
export default function BottomNav() {
  const pathname = usePathname();

  const menus = [
    { href: "/dashboard", label: "🏠", title: "Home" },
    { href: "/dashboard/pasien", label: "👨‍⚕️", title: "Pasien" },
    { href: "/dashboard/inventaris", label: "📦", title: "Inventaris" },
    { href: "/dashboard/laporan", label: "📊", title: "Laporan" },
    { href: "/dashboard/pengaturan", label: "⚙️", title: "Pengaturan" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50
                 bg-[#04070d]/85 backdrop-blur-md
                 border-t border-cyan-700/30
                 flex justify-around gap-0.5 px-1
                 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:hidden
                 text-[10px] text-cyan-300 shadow-[0_0_12px_rgba(0,255,255,0.15)]
                 sm:text-xs"
    >
      {menus.map((menu) => {
        const isActive = pathname === menu.href;
        return (
          <Link
            key={menu.href}
            href={menu.href}
            className={`flex flex-col items-center transition-all ${
              isActive
                ? "text-yellow-400 drop-shadow-[0_0_6px_rgba(255,255,0,0.6)]"
                : "hover:text-cyan-200"
            }`}
          >
            <span className="text-xl leading-none">{menu.label}</span>
            <span className="text-[11px] mt-[2px]">{menu.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

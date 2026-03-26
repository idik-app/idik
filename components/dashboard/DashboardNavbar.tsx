"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardNavbar() {
  const pathname = usePathname();

  const links = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "About / Philosophy", href: "/about" },
    { name: "Analytics", href: "/analytics" },
    { name: "Version Log", href: "/version-log" },
  ];

  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 flex justify-between items-center 
                 px-8 py-3 backdrop-blur-md bg-black/40 border-b border-cyan-500/20 
                 text-cyan-300 font-medium animate-in fade-in slide-in-from-top-2 duration-300"
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-cyan-400 font-bold tracking-wide text-lg">
          IDIK-APP
        </span>
        <span className="text-xs text-cyan-300/70">
          Autonomous Cathlab Intelligence
        </span>
      </div>

      {/* Navigation Links */}
      <div className="flex gap-6 text-sm">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`${
                active ? "text-yellow-400" : "hover:text-cyan-200"
              } transition`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

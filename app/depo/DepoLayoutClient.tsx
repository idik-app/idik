"use client";

import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pill,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const nav: NavItem[] = [
  { href: "/depo/dashboard", label: "Depo", Icon: LayoutDashboard },
  { href: "/depo/master", label: "Master data", Icon: Pill },
  { href: "/depo/master-barang", label: "Master barang", Icon: Package },
  { href: "/depo/pemakaian", label: "Pemakaian / resep", Icon: ClipboardList },
  { href: "/depo/stok-opname", label: "Stok opname", Icon: Boxes },
  { href: "/depo/laporan/keluar", label: "Laporan keluar", Icon: FileBarChart },
  { href: "/depo/profil", label: "Profil", Icon: User },
];

export default function DepoLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("depo-sidebar-collapsed");
      if (v === "1") setSidebarCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white print:bg-white">
      <div className="border-b border-emerald-900/60 bg-slate-950/60 backdrop-blur print:hidden">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-white">
              IDIK-App • Portal Depo Farmasi
            </div>
            <div className="truncate text-sm font-semibold text-white">
              Stok, verifikasi resep, dan laporan farmasi
            </div>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-full text-[11px] text-white bg-slate-900/70 border border-emerald-800/70 hover:bg-slate-900"
            onClick={async () => {
              await fetch("/api/auth", {
                method: "DELETE",
                credentials: "include",
              });
              window.location.href = "/";
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div
        className={[
          "mx-auto max-w-7xl px-4 py-4 grid grid-cols-1 gap-4 transition-[grid-template-columns] duration-200 ease-out",
          sidebarCollapsed ? "md:grid-cols-[56px_1fr]" : "md:grid-cols-[220px_1fr]",
          "print:grid-cols-1 print:max-w-none print:px-2 print:py-0",
        ].join(" ")}
      >
        <aside
          className={[
            "md:sticky md:top-4 h-fit rounded-2xl border border-emerald-900/60 bg-slate-950/40",
            sidebarCollapsed ? "md:p-1.5 p-2" : "p-2",
            "print:hidden",
          ].join(" ")}
        >
          <div className="mb-1.5 grid min-h-8 grid-cols-[1fr_auto_1fr] items-center">
            <div className="min-w-0" aria-hidden />
            <span
              className={[
                "justify-self-center text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-white",
                sidebarCollapsed ? "md:hidden" : "",
              ].join(" ")}
            >
              Menu
            </span>
            <div className="flex min-w-0 justify-end">
              <button
                type="button"
                aria-expanded={!sidebarCollapsed}
                aria-label={
                  sidebarCollapsed ? "Buka menu samping" : "Sembunyikan menu samping"
                }
                title={sidebarCollapsed ? "Buka menu" : "Sembunyikan menu"}
                onClick={() => {
                  setSidebarCollapsed((c) => {
                    const next = !c;
                    try {
                      window.localStorage.setItem(
                        "depo-sidebar-collapsed",
                        next ? "1" : "0"
                      );
                    } catch {
                      /* ignore */
                    }
                    return next;
                  });
                }}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-800/70 bg-slate-900/70 text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-400/80"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" aria-hidden />
                ) : (
                  <PanelLeftClose className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>
          <nav
            className={[
              "flex gap-1 overflow-x-auto",
              sidebarCollapsed ? "md:flex-col md:overflow-x-visible" : "md:flex-col",
            ].join(" ")}
          >
            {nav.map((i) => {
              const active =
                pathname === i.href ||
                (i.href !== "/depo/dashboard" &&
                  i.href !== "/depo/profil" &&
                  pathname.startsWith(`${i.href}/`));
              const Icon = i.Icon;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  title={i.label}
                  className={[
                    "flex items-center gap-2 rounded-xl text-[12px] transition-colors duration-150",
                    sidebarCollapsed
                      ? "md:justify-center md:px-0 md:py-2.5 px-3 py-2 whitespace-nowrap"
                      : "px-3 py-2 whitespace-nowrap",
                    active
                      ? "font-semibold text-white border-2 border-cyan-400/80 bg-emerald-950/50 shadow-[0_0_18px_rgba(34,211,238,0.2)]"
                      : "border-2 border-transparent hover:bg-slate-900/60 text-white",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4 shrink-0 text-white" aria-hidden />
                  <span
                    className={sidebarCollapsed ? "md:sr-only" : ""}
                  >
                    {i.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="rounded-2xl border border-emerald-900/60 bg-slate-950/30 p-0 min-h-[50vh] print:border-0 print:min-h-0 print:bg-white print:shadow-none">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Bell,
  ClipboardList,
  History,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

type MeResponse =
  | {
      ok: true;
      distributor: { nama_pt: string } | null;
      ruangan: string;
      mode?: string;
    }
  | { ok: false; message?: string };

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Gabung ke query string (mis. filter jenis peristiwa). */
  queryExtra?: string;
};

function mergeNavQuery(
  adminView: boolean,
  distributorId: string,
  item: NavItem,
) {
  const params = new URLSearchParams();
  if (adminView && distributorId) {
    params.set("distributor_id", distributorId);
  }
  if (item.queryExtra) {
    const idx = item.queryExtra.indexOf("=");
    if (idx !== -1) {
      params.set(
        item.queryExtra.slice(0, idx),
        item.queryExtra.slice(idx + 1),
      );
    }
  }
  const q = params.toString();
  return q ? `${item.href}?${q}` : item.href;
}

const nav: NavItem[] = [
  { href: "/distributor/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/distributor/barang", label: "Barang", Icon: Package },
  {
    href: "/distributor/stok-opname",
    label: "Stok opname",
    Icon: ClipboardList,
  },
  { href: "/distributor/panel-retur", label: "Panel retur", Icon: RotateCcw },
  {
    href: "/distributor/riwayat",
    label: "Histori retur",
    Icon: History,
    queryExtra: "event_type=KATALOG_RETUR",
  },
  { href: "/distributor/pemakaian", label: "Pemakaian", Icon: Activity },
  { href: "/distributor/stok-menipis", label: "Stok Menipis", Icon: AlertTriangle },
  { href: "/distributor/notifikasi", label: "Notifikasi", Icon: Bell },
  { href: "/distributor/profil", label: "Profil", Icon: User },
];

export default function DistributorLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedDistributorId = searchParams.get("distributor_id") ?? "";

  const [header, setHeader] = useState<{
    pt: string;
    ruangan: string;
    mode?: string;
  } | null>(null);

  const [distributors, setDistributors] = useState<
    { id: string; nama_pt: string; is_active: boolean }[]
  >([]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  /** Hanya true setelah mount — hindari mismatch hidrasi (ekstensi sering menambah atribut ke <button>). */
  const [layoutInteractive, setLayoutInteractive] = useState(false);

  useEffect(() => {
    setLayoutInteractive(true);
    try {
      const v = window.localStorage.getItem("distributor-sidebar-collapsed");
      if (v === "1") setSidebarCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/distributor/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: MeResponse) => {
        if (!alive) return;
        if (j.ok) {
          const pt =
            j.distributor?.nama_pt ??
            (j.mode === "admin_view"
              ? "Administrator (All Distributors)"
              : "Distributor");
          setHeader({ pt, ruangan: j.ruangan, mode: j.mode });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const adminView = header?.mode === "admin_view";

  useEffect(() => {
    if (!adminView) return;
    let alive = true;
    fetch("/api/distributor/distributors", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setDistributors(j?.data ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [adminView]);

  const headerPt = useMemo(() => {
    if (!header) return "Distributor";
    if (!adminView) return header.pt;
    if (!selectedDistributorId) return "Administrator (All Distributors)";
    const hit = distributors.find((d) => d.id === selectedDistributorId);
    return hit ? `Administrator • ${hit.nama_pt}` : "Administrator";
  }, [adminView, distributors, header, selectedDistributorId]);

  return (
    <div className="min-h-app min-w-0 bg-[#020617] text-cyan-100">
      <div className="border-b border-cyan-900/60 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-cyan-400/80">
              IDIK-App • Portal Distributor
            </div>
            <div className="truncate text-sm font-semibold text-[#D4AF37]">
              {headerPt}
              <span className="ml-2 text-[11px] text-cyan-300/80">
                Lokasi: {header?.ruangan ?? "Cathlab"}
              </span>
            </div>
          </div>

          {adminView && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-cyan-300/80">Distributor:</span>
              <select
                value={selectedDistributorId}
                onChange={(e) => {
                  const v = e.target.value;
                  const params = new URLSearchParams(searchParams.toString());
                  if (v) params.set("distributor_id", v);
                  else params.delete("distributor_id");
                  const q = params.toString();
                  const nextUrl = q ? `${pathname}?${q}` : pathname;
                  router.replace(nextUrl);
                }}
                className="bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                <option value="">Semua Distributor</option>
                {distributors
                  .filter((d) => d.is_active)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama_pt}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <button
            type="button"
            suppressHydrationWarning
            className="px-3 py-1.5 rounded-full text-[11px] bg-slate-900/70 border border-cyan-800/70 hover:bg-slate-900"
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
        ].join(" ")}
      >
        <aside
          className={[
            "md:sticky md:top-4 h-fit rounded-2xl border border-cyan-900/60 bg-slate-950/40",
            sidebarCollapsed ? "md:p-1.5 p-2" : "p-2",
          ].join(" ")}
        >
          <div className="mb-1.5 grid min-h-8 grid-cols-[1fr_auto_1fr] items-center">
            <div className="min-w-0" aria-hidden />
            <span
              className={[
                "justify-self-center text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200/90",
                sidebarCollapsed ? "md:hidden" : "",
              ].join(" ")}
            >
              Menu
            </span>
            <div className="flex min-w-0 justify-end">
              {layoutInteractive ? (
                <button
                  type="button"
                  aria-expanded={!sidebarCollapsed}
                  aria-label={
                    sidebarCollapsed
                      ? "Buka menu samping"
                      : "Sembunyikan menu samping"
                  }
                  title={sidebarCollapsed ? "Buka menu" : "Sembunyikan menu"}
                  onClick={() => {
                    setSidebarCollapsed((c) => {
                      const next = !c;
                      try {
                        window.localStorage.setItem(
                          "distributor-sidebar-collapsed",
                          next ? "1" : "0",
                        );
                      } catch {
                        /* ignore */
                      }
                      return next;
                    });
                  }}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-800/70 bg-slate-900/70 text-cyan-200/90 hover:bg-slate-900 hover:text-cyan-50 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="h-4 w-4" aria-hidden />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" aria-hidden />
                  )}
                </button>
              ) : (
                <div
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-800/70 bg-slate-900/70 text-cyan-200/90"
                  aria-hidden
                >
                  <PanelLeftClose className="h-4 w-4" aria-hidden />
                </div>
              )}
            </div>
          </div>
          <nav
            className={[
              "flex gap-1 overflow-x-auto",
              sidebarCollapsed ? "md:flex-col md:overflow-x-visible" : "md:flex-col",
            ].join(" ")}
          >
            {nav.map((i) => {
              const active = pathname === i.href;
              const href = mergeNavQuery(
                adminView,
                selectedDistributorId,
                i,
              );
              const Icon = i.Icon;
              return (
                <Link
                  key={`${i.href}-${i.queryExtra ?? ""}`}
                  href={href}
                  title={i.label}
                  className={[
                    "flex items-center gap-2 rounded-xl text-[12px] transition-colors duration-150",
                    sidebarCollapsed
                      ? "md:justify-center md:px-0 md:py-2.5 px-3 py-2 whitespace-nowrap"
                      : "px-3 py-2 whitespace-nowrap",
                    active
                      ? [
                          "relative z-0 font-semibold text-amber-50",
                          "border-2 border-[#D4AF37]/90",
                          "bg-gradient-to-b from-[#D4AF37]/40 to-amber-950/50",
                          "shadow-[0_0_22px_rgba(212,175,55,0.38),inset_0_1px_0_rgba(255,255,255,0.14)]",
                          "ring-2 ring-[#D4AF37]/45",
                        ].join(" ")
                      : "border-2 border-transparent hover:bg-slate-900/60 text-cyan-200/80",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "h-4 w-4 shrink-0",
                      active ? "text-amber-50" : "text-cyan-300/90",
                    ].join(" ")}
                    aria-hidden
                  />
                  <span
                    className={[
                      sidebarCollapsed ? "md:sr-only" : "",
                    ].join(" ")}
                  >
                    {i.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="rounded-2xl border border-cyan-900/60 bg-slate-950/30 p-4">
          {children}
        </main>
      </div>
    </div>
  );
}

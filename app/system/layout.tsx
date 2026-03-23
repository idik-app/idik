"use client";

import { LayoutContainer } from "@/components/layout";

/**
 * Layout System – pakai chrome yang sama dengan dashboard (Sidebar, Topbar, TabBar).
 * Semua route /system/* tetap menampilkan sidebar, header, dan tab; konten diisi dari TabContext.
 */
export default function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutContainer />;
}

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { menuConfig } from "@/app/config/menuConfig";
import { warmTabModuleChunks } from "@/lib/navigation/warmTabModuleChunks";

function collectMenuHrefs(): string[] {
  const out: string[] = [];
  for (const group of menuConfig) {
    for (const item of group.items ?? []) {
      if (typeof item.href === "string" && item.href.length > 0) {
        out.push(item.href);
      }
    }
  }
  return [...new Set(out)];
}

function runWhenIdle(fn: () => void) {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => fn(), { timeout: 4000 });
  } else {
    setTimeout(fn, 400);
  }
}

/**
 * Setelah shell dashboard mount: prefetch rute App Router + mulai pre-load chunk modul tab.
 * Mempercepat klik tab pertama (Next flight + dynamic import sudah panas).
 */
export default function DashboardRouteWarmup() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    runWhenIdle(() => {
      const hrefs = collectMenuHrefs();
      hrefs.forEach((href, i) => {
        setTimeout(() => {
          try {
            router.prefetch(href);
          } catch {
            // noop
          }
        }, i * 35);
      });

      void warmTabModuleChunks().catch(() => {});
    });
  }, [router]);

  return null;
}

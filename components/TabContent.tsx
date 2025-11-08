"use client";
import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { useTabs } from "@app/contexts/TabContext";

/*───────────────────────────────────────────────
 ⚙️ Dynamic Imports – All Modules
───────────────────────────────────────────────*/
const DashboardMain = dynamic(() => import("@/app/dashboard/page")); // ✅ Server dashboard utama
const PasienPage = dynamic(() => import("@/app/dashboard/pasien/page"));
const DokterPage = dynamic(() => import("@/app/dashboard/dokter/page"));
const InventarisPage = dynamic(() => import("@/app/dashboard/inventaris/page"));
const PemakaianPage = dynamic(() => import("@/app/dashboard/pemakaian/page"));
const DatabasePage = dynamic(() => import("@/app/system/database/page"));
const SystemPage = dynamic(() => import("@/app/system/page"));

/* 🔧 System / Developer Mode */
const ConsolePage = dynamic(() => import("@/app/system/console/page"));
const ApiKeysPage = dynamic(() => import("@/app/system/api-keys/page"));
const SupabasePage = dynamic(() => import("@/app/system/supabase/page"));
const DBExplorerPage = dynamic(
  () => import("@/components/dashboard/DashboardClient") // ✅ hanya di sini
);
const DebugPage = dynamic(() => import("@app/system/debug/page"));
const VersionPage = dynamic(() => import("@/app/system/version/page"));

/*───────────────────────────────────────────────
 🧩 TabContent – Cached Persistent Edition (Final)
───────────────────────────────────────────────*/
export default function TabContent() {
  const { activeTab } = useTabs();
  const cache = useRef<Record<string, React.ReactNode>>({});

  const createComponent = (id: string): React.ReactNode => {
    switch (id) {
      case "dashboard":
        return <DashboardMain />; // ✅ Hanya statistik server
      case "pasien":
        return <PasienPage />;
      case "dokter":
        return <DokterPage />;
      case "inventaris":
        return <InventarisPage />;
      case "pemakaian":
        return <PemakaianPage />;
      case "database":
        return <DatabasePage />;
      case "console":
        return <ConsolePage />;
      case "api-keys":
        return <ApiKeysPage />;
      case "supabase":
        return <SupabasePage />;
      case "database-explorer":
      case "system-database":
        return <DBExplorerPage />; // ✅ Tampilkan DashboardClient di tab explorer
      case "debug":
        return <DebugPage />;
      case "version":
        return <VersionPage />;
      case "system":
        return <SystemPage />;
      default:
        return (
          <div className="p-8 text-yellow-400">
            <h2>⚠️ Modul belum ditemukan:</h2>
            <p>{id}</p>
          </div>
        );
    }
  };

  if (!cache.current[activeTab]) {
    console.log("🧠 [TabContent] Membuat cache baru untuk tab:", activeTab);
    cache.current[activeTab] = createComponent(activeTab);
  }

  return (
    <div className="relative w-full h-full">
      {Object.entries(cache.current).map(([id, element]) => (
        <div
          key={id}
          hidden={activeTab !== id}
          className="absolute inset-0 w-full h-full"
        >
          {element}
        </div>
      ))}
    </div>
  );
}

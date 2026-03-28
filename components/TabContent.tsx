"use client";
import React from "react";
import dynamic from "next/dynamic";
import { useTabs } from "@/app/contexts/TabContext";

/** Cache modul-level: tetap hidup walau TabContent remount (keep-alive sejati). */
const tabPanelCache: Record<
  string,
  { node: React.ReactNode; updatedAt: number }
> = Object.create(null);

/*───────────────────────────────────────────────
 ⚙️ Dynamic Imports – All Modules
───────────────────────────────────────────────*/
const DashboardMain = dynamic(() => import("@/app/dashboard/page")); // ✅ Server dashboard utama
const PasienPage = dynamic(() => import("@/app/dashboard/pasien/page"));
const DokterPage = dynamic(() => import("@/app/dashboard/dokter/page"));
const RuanganPage = dynamic(() => import("@/app/dashboard/ruangan/page"));
const PerawatHubPage = dynamic(() => import("@/app/dashboard/perawat/page"));
const InventarisPage = dynamic(() => import("@/app/dashboard/inventaris/page"));
const PemakaianPage = dynamic(() => import("@/app/dashboard/pemakaian/page"));
const MasterFarmasiPage = dynamic(
  () => import("@/app/dashboard/farmasi/master/page")
);
const TindakanPage = dynamic(
  () => import("@/app/dashboard/layanan/tindakan/page")
);
const MasterTindakanPage = dynamic(
  () => import("@/app/dashboard/layanan/master-tindakan/page")
);
const LaporanPage = dynamic(() => import("@/app/dashboard/laporan/page"));
const MonitoringPage = dynamic(
  () => import("@/app/dashboard/smart/monitoring/page")
);
const Koronar3DPage = dynamic(
  () => import("@/app/dashboard/cathlab/koronar-3d/page")
);
const AnalyticsPage = dynamic(
  () => import("@/app/dashboard/smart/analytics/page")
);
const DatabasePage = dynamic(() => import("@/app/system/database/page"));
const SystemPage = dynamic(() => import("@/app/system/page"));

/* 🔧 System / Developer Mode */
const ConsolePage = dynamic(() => import("@/app/system/console/page"));
const ApiKeysPage = dynamic(() => import("@/app/system/api-keys/page"));
const SupabasePage = dynamic(() => import("@/app/system/supabase/page"));
const DBExplorerPage = dynamic(
  () => import("@/components/dashboard/DashboardClient") // ✅ hanya di sini
);
const DebugPage = dynamic(() => import("@/app/system/debug/page"));
const VersionPage = dynamic(() => import("@/app/system/version/page"));
const AuditPage = dynamic(() => import("@/app/system/database/audit/page"));
const SettingsPage = dynamic(() => import("@/app/dashboard/settings/page"));
const AdminPage = dynamic(() => import("@/app/dashboard/admin/page"));

/*───────────────────────────────────────────────
 🧩 TabContent – Cached Persistent Edition (Final)
───────────────────────────────────────────────*/
export default function TabContent() {
  const { activeTab, tabs } = useTabs();

  const createComponent = (id: string): React.ReactNode => {
    switch (id) {
      case "dashboard":
        return <DashboardMain />; // ✅ Hanya statistik server
      case "pasien":
        return <PasienPage />;
      case "dokter":
        return <DokterPage />;
      case "ruangan":
        return <RuanganPage />;
      case "perawat":
        return <PerawatHubPage />;
      case "inventaris":
        return <InventarisPage />;
      case "pemakaian":
        return <PemakaianPage />;
      case "farmasi-master-data":
      case "master":
        return <MasterFarmasiPage />;
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
      case "audit":
        return <AuditPage />;
      case "system":
        return <SystemPage />;
      case "tindakan":
        return <TindakanPage />;
      case "master-tindakan":
        return <MasterTindakanPage />;
      case "laporan":
      case "report":
        return <LaporanPage />;
      case "monitoring":
        return <MonitoringPage />;
      case "koronar-3d":
        return <Koronar3DPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "diagnostics":
        return <SystemPage />;
      case "admin":
        return <AdminPage />;
      case "pengaturan":
      case "settings":
        return <SettingsPage />;

      default:
        return (
          <div className="p-8 text-yellow-400">
            <h2>⚠️ Modul belum ditemukan:</h2>
            <p>{id}</p>
          </div>
        );
    }
  };

  const tabIds = tabs.map((t) => t.id);
  const getUpdatedAt = (id: string) =>
    tabs.find((t) => t.id === id)?.updatedAt ?? 0;

  /* Selalu isi cache untuk activeTab agar konten tidak blank (race dengan tabs init) */
  if (activeTab) {
    const updatedAt = getUpdatedAt(activeTab);
    const cached = tabPanelCache[activeTab];
    if (!cached || cached.updatedAt !== updatedAt) {
      tabPanelCache[activeTab] = {
        node: createComponent(activeTab),
        updatedAt,
      };
    }
  }

  /* Gabung tabIds + activeTab supaya tab aktif tetap di-render saat tabs masih kosong atau belum sinkron */
  const idsToRender = [...new Set([...tabIds, activeTab].filter(Boolean))];
  const entriesToRender = idsToRender.filter((id) => tabPanelCache[id]);

  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden">
      {entriesToRender.map((id) => (
        <div
          key={id}
          hidden={activeTab !== id}
          className="absolute inset-0 w-full h-full"
        >
          {tabPanelCache[id].node}
        </div>
      ))}
    </div>
  );
}

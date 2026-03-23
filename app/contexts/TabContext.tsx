"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useJarvisFX } from "@/contexts/JarvisFXContext";
import DatabaseExplorer from "@/app/system/database/DatabaseExplorer";
import AuditViewer from "@/app/system/database/audit/AuditViewer";

/* ⚙️ Cathlab JARVIS TabContext v6.4 – Database-Ready Edition
   💠 Menambahkan dukungan modul Database & fallback otomatis
   💠 Sinkronisasi URL ↔ tab id (settings→pengaturan, admin→dashboard, laporan→report)
*/

/** Mapping segment URL → id tab (harus sama dengan id di menuConfig) */
const URL_SEGMENT_TO_TAB: Record<string, { id: string; label: string }> = {
  settings: { id: "pengaturan", label: "Pengaturan" },
  admin: { id: "admin", label: "Manajemen User" },
  laporan: { id: "report", label: "Report Generator" },
  audit: { id: "audit", label: "Audit Log" },
  master: { id: "farmasi-master-data", label: "Master Data Farmasi" },
};

export type Tab = {
  id: string;
  label: string;
  fixed?: boolean;
  component?: ReactNode;
  updatedAt?: number;
};

type TabContextType = {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (id: string) => void;
  addTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  closeAllTabs: () => void;
  refreshTab: (id: string) => void;
  loadingTab: boolean;
  setLoadingTab: (v: boolean) => void;
  direction: number;
  setDirection: (v: number) => void;
};

const TabContext = createContext<TabContextType | undefined>(undefined);

export function useTabContext() {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error("useTabContext must be used within a TabProvider");
  return ctx;
}

/* ─────────────────────────────────────────────── */
export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, _setActiveTab] = useState("dashboard");
  const [loadingTab, setLoadingTab] = useState(false);
  const [direction, setDirection] = useState(1);
  const initialized = useRef(false);
  const pathname = usePathname();
  const { triggerFX } = useJarvisFX();

  /* ⚡ Ganti tab aktif */
  const setActiveTab = (id: string) => {
    console.log("🖱️ [TabContext] Request to activate tab:", id);
    if (id === activeTab) {
      console.log("⚠️ [TabContext] Tab", id, "sudah aktif, abaikan.");
      return;
    }

    _setActiveTab(id);
    setDirection(id > activeTab ? 1 : -1);
    setLoadingTab(true);
    triggerFX("scan-page");

    console.log("✅ [TabContext] Active tab updated →", id);
    console.log(
      "💡 [TabContext] Direction →",
      id > activeTab ? "Next" : "Prev"
    );

    setTimeout(() => {
      console.log("⏱️ [TabContext] Loading selesai untuk tab:", id);
      setLoadingTab(false);
    }, 650);
  };

  /* 🔄 Refresh tab */
  const refreshTab = (id: string) => {
    console.log("🔁 [TabContext] Refreshing tab:", id);
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, updatedAt: Date.now() } : t))
    );
    triggerFX("refresh");
  };

  /* ➕ Tambah tab baru dengan mapping komponen */
  const addTab = (tab: Tab) => {
    console.log("➕ [TabContext] Menambahkan tab:", tab.id);

    // daftar modul resmi (admin = dashboard utama untuk role admin)
    const components: Record<string, ReactNode> = {
      dashboard: <FixedDashboardContent />,
      admin: <FixedDashboardContent />,
      database: <DatabaseExplorer />,
      audit: (
        <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-cyan-950 p-6">
          <AuditViewer />
        </main>
      ),
    };

    setTabs((prev) => {
      const exists = prev.some((t) => t.id === tab.id);
      console.log("🔍 [TabContext] Tab sudah ada?", exists);

      if (exists) return prev;

      const component = components[tab.id] || (
        <div className="p-4 text-red-400">
          ⚠️ Modul belum ditemukan: <b>{tab.id}</b>
        </div>
      );

      return [...prev, { ...tab, component, updatedAt: Date.now() }];
    });

    setActiveTab(tab.id);
  };

  /* ❌ Tutup tab (fallback active disinkronkan lewat useEffect) */
  const closeTab = (id: string) => {
    console.log("❌ [TabContext] Menutup tab:", id);
    setTabs((prev) => prev.filter((t) => t.id !== id));
  };

  /* 🗑️ Tutup semua tab, sisakan hanya Dashboard (selalu lengkapi component agar tidak hilang) */
  const closeAllTabs = () => {
    console.log("🗑️ [TabContext] Tutup semua tab");
    const fullDashboardTab: Tab = {
      id: "dashboard",
      label: "Dashboard Utama",
      fixed: true,
      component: <FixedDashboardContent />,
      updatedAt: Date.now(),
    };
    setTabs((prev) => {
      const existing = prev.find((t) => t.id === "dashboard");
      const keep =
        existing?.component != null
          ? { ...existing, updatedAt: Date.now() }
          : fullDashboardTab;
      return [keep];
    });
    _setActiveTab("dashboard");
  };

  /* ↩️ Pastikan activeTab selalu merujuk ke tab yang masih ada */
  useEffect(() => {
    if (tabs.length === 0) return;
    const exists = tabs.some((t) => t.id === activeTab);
    if (!exists) {
      const fallback = tabs[tabs.length - 1]?.id || "dashboard";
      console.log("↩️ [TabContext] ActiveTab tidak ada di list, fallback →", fallback);
      _setActiveTab(fallback);
    }
  }, [tabs, activeTab]);

  /* 🧠 Inisialisasi pertama kali: pastikan dashboard ada tanpa menimpa tab dari URL sync */
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      console.log(
        "🚀 [TabContext] Inisialisasi pertama kali (Dashboard Default)"
      );
      setTabs((prev) => {
        if (prev.some((t) => t.id === "dashboard")) return prev;
        return [
          {
            id: "dashboard",
            label: "Dashboard Utama",
            fixed: true,
            component: <FixedDashboardContent />,
            updatedAt: Date.now(),
          },
          ...prev,
        ];
      });
    }
  }, []);

  /* 🔹 Sinkronisasi URL → Tab aktif + pastikan tab ada di list */
  useEffect(() => {
    if (!pathname) return;
    const segment = pathname.split("/").pop() || "dashboard";
    const resolved = URL_SEGMENT_TO_TAB[segment] ?? {
      id: segment,
      label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
    };
    const tabId = resolved.id;
    const tabLabel = resolved.label;

    setTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev;
      return [...prev, { id: tabId, label: tabLabel, updatedAt: Date.now() }];
    });
    _setActiveTab(tabId);
    console.log("🌐 [TabContext] URL → tab:", segment, "→", tabId);
  }, [pathname]);

  // log perubahan aktif
  useEffect(() => {
    console.log("🧭 [TabContext] ActiveTab berubah menjadi:", activeTab);
  }, [activeTab]);

  /* ─────────────────────────────────────────────── */
  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTab,
        setActiveTab,
        addTab,
        closeTab,
        closeAllTabs,
        refreshTab,
        loadingTab,
        setLoadingTab,
        direction,
        setDirection,
      }}
    >
      {children}
    </TabContext.Provider>
  );
}

/* 💠 Dashboard Default */
function FixedDashboardContent() {
  return (
    <div className="p-6 text-cyan-200">
      <h2 className="text-xl font-semibold mb-2">Dashboard Utama</h2>
      <p>Modul ini dimuat secara default untuk memastikan TabContext aktif.</p>
    </div>
  );
}

export { useTabContext as useTabs };

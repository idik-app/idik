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
import { useJarvisFX } from "@contexts/JarvisFXContext";
import DatabaseExplorer from "@app/system/database//DatabaseExplorer";

/* ⚙️ Cathlab JARVIS TabContext v6.4 – Database-Ready Edition
   💠 Menambahkan dukungan modul Database & fallback otomatis
*/

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

    // daftar modul resmi
    const components: Record<string, ReactNode> = {
      dashboard: <FixedDashboardContent />,
      database: <DatabaseExplorer />,
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

  /* ❌ Tutup tab */
  const closeTab = (id: string) => {
    console.log("❌ [TabContext] Menutup tab:", id);
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (activeTab === id) {
        const fallback = filtered[filtered.length - 1]?.id || "dashboard";
        console.log("↩️ [TabContext] Beralih ke tab fallback:", fallback);
        setActiveTab(fallback);
      }
      return filtered;
    });
  };

  /* 🧠 Inisialisasi pertama kali */
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      console.log(
        "🚀 [TabContext] Inisialisasi pertama kali (Dashboard Default)"
      );
      setTabs([
        {
          id: "dashboard",
          label: "Dashboard Utama",
          fixed: true,
          component: <FixedDashboardContent />,
          updatedAt: Date.now(),
        },
      ]);
    }
  }, []);

  /* 🔹 Sinkronisasi URL → Tab aktif */
  useEffect(() => {
    if (!pathname) return;
    const last = pathname.split("/").pop() || "dashboard";
    if (last !== activeTab) {
      console.log("🌐 [TabContext] Sinkronisasi URL →", last);
      _setActiveTab(last);
    }
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

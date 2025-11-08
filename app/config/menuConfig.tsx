"use client";

import {
  House,
  Users,
  Stethoscope,
  Activity,
  Box,
  ClipboardList,
  FileBarChart,
  HeartPulse,
  Wrench,
  Cpu,
  BarChart4,
  Settings,
  Wallet,
  Bell,
  ShieldCheck,
  LineChart,
  CandlestickChart,
  Database,
  Bug,
  KeySquare,
  Terminal,
  Network,
  Info,
} from "lucide-react";

/* ⚡ menuConfig v3.4.4 – Gold-Cyan Hybrid (Synced)
   🔹 Sinkron 100% dengan struktur /app/dashboard/system/[page].tsx
   🔹 Siap untuk TabContext v6.4 & Sidebar v5.6.5
   🔹 Role-based visibility dapat diaktifkan per modul
*/

export const menuConfig = [
  {
    group: "Main",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <House size={18} />,
        path: "/dashboard",
      },
      {
        id: "pasien",
        label: "Pasien",
        icon: <Users size={18} />,
        path: "/dashboard/pasien",
      },
      {
        id: "dokter",
        label: "Dokter",
        icon: <Stethoscope size={18} />,
        path: "/dashboard/dokter",
      },
    ],
  },
  {
    group: "Cathlab",
    items: [
      {
        id: "inventaris",
        label: "Inventaris",
        icon: <Box size={18} />,
        path: "/dashboard/inventaris",
      },
      {
        id: "pemakaian",
        label: "Pemakaian",
        icon: <ClipboardList size={18} />,
        path: "/dashboard/pemakaian",
      },
      {
        id: "monitoring",
        label: "Monitoring",
        icon: <HeartPulse size={18} />,
        path: "/dashboard/monitoring",
      },
      {
        id: "grafik",
        label: "Grafik",
        icon: <Activity size={18} />,
        path: "/dashboard/grafik",
      },
    ],
  },
  {
    group: "Admin",
    items: [
      {
        id: "vendor",
        label: "Vendor / Distributor",
        icon: <Database size={18} />,
        path: "/dashboard/vendor",
      },
      {
        id: "logistik",
        label: "Logistik & Stok",
        icon: <Wrench size={18} />,
        path: "/dashboard/logistik",
      },
      {
        id: "user",
        label: "Manajemen User",
        icon: <ShieldCheck size={18} />,
        path: "/dashboard/user",
      },
    ],
  },
  {
    group: "Trading",
    items: [
      {
        id: "market",
        label: "Market Overview",
        icon: <LineChart size={18} />,
        path: "/dashboard/trading/market",
      },
      {
        id: "alerts-signals",
        label: "Alerts & Signals",
        icon: <Bell size={18} />,
        path: "/dashboard/trading/alerts-signals",
      },
      {
        id: "auto-trade",
        label: "Auto Trade",
        icon: <Cpu size={18} />,
        path: "/dashboard/trading/auto-trade",
      },
      {
        id: "portfolio",
        label: "Portfolio",
        icon: <Wallet size={18} />,
        path: "/dashboard/trading/portfolio",
      },
      {
        id: "charts",
        label: "Charts",
        icon: <CandlestickChart size={18} />,
        path: "/dashboard/trading/charts",
      },
    ],
  },
  {
    group: "Tools",
    items: [
      {
        id: "report",
        label: "Report Generator",
        icon: <FileBarChart size={18} />,
        path: "/dashboard/tools/report",
      },
      {
        id: "analytics",
        label: "Analytics",
        icon: <BarChart4 size={18} />,
        path: "/dashboard/tools/analytics",
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        id: "pengaturan",
        label: "Pengaturan",
        icon: <Settings size={18} />,
        path: "/dashboard/settings/pengaturan",
      },
    ],
  },
  {
    group: "System / Developer Mode",
    items: [
      {
        id: "console",
        label: "Console & Logs",
        icon: <Terminal size={18} />,
        path: "/dashboard/system/console",
      },
      {
        id: "api-keys",
        label: "API Keys",
        icon: <KeySquare size={18} />,
        path: "/dashboard/system/api-keys",
      },
      {
        id: "supabase",
        label: "Supabase Console",
        icon: <Network size={18} />,
        path: "/dashboard/system/supabase",
      },
      {
        id: "database",
        label: "Database Explorer",
        icon: <Database size={18} />,
        path: "/dashboard/system/database",
      },
      {
        id: "debug",
        label: "Debug Tools",
        icon: <Bug size={18} />,
        path: "/dashboard/system/debug",
      },
      {
        id: "version",
        label: "Version Info",
        icon: <Info size={18} />,
        path: "/dashboard/system/version",
      },
      {
        id: "system",
        label: "System Status", // ← Tambahan baru
        icon: <Cpu size={18} />, // ← Ikon Build Meta / Status
        path: "/system", // ← Path langsung ke /system
      },
    ],
  },
];

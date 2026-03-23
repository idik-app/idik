"use client";

import {
  House,
  Users,
  Stethoscope,
  Box,
  ClipboardList,
  FileBarChart,
  HeartPulse,
  BarChart4,
  Database,
  Bug,
  KeySquare,
  Terminal,
  Network,
  Info,
  GaugeCircle,
  ScrollText,
  Syringe,
  ShieldCheck,
  Settings,
} from "lucide-react";

/* ⚡ menuConfig v4.0 – Neo-Hologram Gold-Cyan Hybrid
   – Adaptive Priority Engine
   – Hologram Pulse / Edge / Scan Presets
   – Role-based (future)
   – Badge-ready (dynamic)
*/

export const menuConfig = [
  /* ============================================
   *  MAIN MODULES
   * ============================================ */
  {
    group: "Main",
    hologram: "edge",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <House size={18} />,
        href: "/dashboard",
        priority: 1,
        module: "DashboardMain",
        hologram: "pulse",
      },
      {
        id: "pasien",
        label: "Pasien",
        icon: <Users size={18} />,
        href: "/dashboard/pasien",
        priority: 2,
        module: "PasienDashboard",
        hologram: "scan",
      },
      {
        id: "dokter",
        label: "Dokter",
        icon: <Stethoscope size={18} />,
        href: "/dashboard/dokter",
        priority: 3,
        module: "DokterDashboard",
        hologram: "scan",
      },
    ],
  },

  /* ============================================
   *  CATHLAB MODULES
   * ============================================ */
  {
    group: "Cathlab",
    hologram: "pulse",
    items: [
      {
        id: "inventaris",
        label: "Inventaris",
        icon: <Box size={18} />,
        href: "/dashboard/inventaris",
        priority: 1,
        module: "InventarisDashboard",
        hologram: "edge",
      },
      {
        id: "pemakaian",
        label: "Pemakaian Alkes",
        icon: <ClipboardList size={18} />,
        href: "/dashboard/pemakaian",
        priority: 1,
        module: "PemakaianDashboard",
        hologram: "pulse",
      },
      {
        id: "monitoring",
        label: "Monitoring Cathlab",
        icon: <HeartPulse size={18} />,
        href: "/dashboard/smart/monitoring",
        priority: 2,
        module: "MonitoringCathlab",
        hologram: "scan",
      },
    ],
  },

  /* ============================================
   *  FARMASI / DEPO
   * ============================================ */
  {
    group: "Farmasi",
    hologram: "pulse",
    items: [
      {
        id: "farmasi-master-data",
        label: "Master Data",
        icon: <Box size={18} />,
        href: "/dashboard/farmasi/master",
        priority: 1,
        module: "FarmasiMasterData",
        hologram: "edge",
      },
      {
        id: "farmasi-stok-opname",
        label: "Stok Opname",
        icon: <ClipboardList size={18} />,
        href: "/dashboard/farmasi/stok-opname",
        priority: 2,
        module: "FarmasiStokOpname",
        hologram: "pulse",
      },
      {
        id: "farmasi-laporan-keluar",
        label: "Lap. Barang Keluar",
        icon: <FileBarChart size={18} />,
        href: "/dashboard/farmasi/laporan/keluar",
        priority: 4,
        module: "FarmasiLaporanKeluar",
        hologram: "edge",
      },
      {
        id: "farmasi-laporan-stok-alkes",
        label: "Lap. Stok Alkes",
        icon: <BarChart4 size={18} />,
        href: "/dashboard/farmasi/laporan/stok-alkes",
        priority: 4,
        module: "FarmasiLaporanStokAlkes",
        hologram: "scan",
      },
    ],
  },

  /* ============================================
   *  LAYANAN MEDIS
   * ============================================ */
  {
    group: "Layanan",
    hologram: "scan",
    items: [
      {
        id: "tindakan",
        label: "Tindakan Medis",
        icon: <Syringe size={18} />,
        href: "/dashboard/layanan/tindakan",
        priority: 1,
        module: "TindakanDashboard", // v7.0 cinematic module
        hologram: "edge",
      },
    ],
  },

  /* ============================================
   *  ADMINISTRATION
   * ============================================ */
  {
    group: "Admin",
    hologram: "edge",
    items: [
      {
        id: "admin",
        label: "Admin",
        icon: <ShieldCheck size={18} />,
        href: "/dashboard/admin",
        priority: 1,
        module: "AdminDashboard",
        hologram: "pulse",
      },
    ],
  },

  /* ============================================
   *  TOOLS
   * ============================================ */
  {
    group: "Tools",
    hologram: "pulse",
    items: [
      {
        id: "report",
        label: "Report Generator",
        icon: <FileBarChart size={18} />,
        href: "/dashboard/laporan",
        priority: 2,
        module: "ReportGenerator",
        hologram: "scan",
      },
      {
        id: "analytics",
        label: "Analytics",
        icon: <BarChart4 size={18} />,
        href: "/dashboard/smart/analytics",
        priority: 1,
        module: "AnalyticsDashboard",
        hologram: "edge",
      },
    ],
  },

  /* ============================================
   *  PENGATURAN
   * ============================================ */
  {
    group: "Pengaturan",
    hologram: "scan",
    items: [
      {
        id: "pengaturan",
        label: "Pengaturan",
        icon: <Settings size={18} />,
        href: "/dashboard/settings",
        priority: 1,
        module: "SettingsDashboard",
        hologram: "pulse",
      },
    ],
  },

  /* ============================================
   *  SYSTEM MODULES (DEV/ADMIN)
   * ============================================ */
  {
    group: "System",
    hologram: "edge",
    items: [
      {
        id: "diagnostics",
        label: "Diagnostics",
        icon: <GaugeCircle size={18} />,
        href: "/system",
        priority: 1,
        module: "DiagnosticsHUD",
        hologram: "pulse",
      },
      {
        id: "database",
        label: "Database Explorer",
        icon: <Database size={18} />,
        href: "/system/database",
        priority: 3,
        module: "DatabaseExplorer",
        hologram: "edge",
      },
      {
        id: "audit",
        label: "Audit Log",
        icon: <ScrollText size={18} />,
        href: "/system/database/audit",
        priority: 4,
        module: "AuditLog",
        hologram: "scan",
      },
      {
        id: "supabase",
        label: "Supabase Console",
        icon: <Network size={18} />,
        href: "/system/supabase",
        priority: 4,
        module: "SupabaseConsole",
        hologram: "scan",
      },
      {
        id: "console",
        label: "Console & Logs",
        icon: <Terminal size={18} />,
        href: "/system/console",
        priority: 4,
        module: "ConsoleLogs",
        hologram: "edge",
      },
      {
        id: "api-keys",
        label: "API Keys",
        icon: <KeySquare size={18} />,
        href: "/system/api-keys",
        priority: 5,
        module: "ApiKeys",
        hologram: "scan",
      },
      {
        id: "debug",
        label: "Debug Tools",
        icon: <Bug size={18} />,
        href: "/system/debug",
        priority: 6,
        module: "DebugTools",
        hologram: "edge",
      },
      {
        id: "version",
        label: "Version Info",
        icon: <Info size={18} />,
        href: "/system/version",
        priority: 7,
        module: "VersionInfo",
        hologram: "pulse",
      },
    ],
  },
];

/**
 * Baris awal menu Jarvis (setara seed migrasi) — dipakai bila suatu
 * `ruangan` belum punya entri di `intensive_jarvis_menu`.
 */
export const DEFAULT_JARVIS_MENU_SEED: Array<{
  label: string;
  icon_name: string;
  action_type: string;
  action_value: string | null;
}> = [
  {
    label: "Toggle Sidebar",
    icon_name: "Menu",
    action_type: "sidebar_toggle",
    action_value: null,
  },
  {
    label: "Tabel Tindakan",
    icon_name: "ClipboardList",
    action_type: "function",
    action_value: "actions_table",
  },
  {
    label: "Tambah Pasien",
    icon_name: "UserPlus",
    action_type: "function",
    action_value: "add_patient",
  },
  {
    label: "Laporan Harian",
    icon_name: "FileText",
    action_type: "function",
    action_value: "report_daily",
  },
  {
    label: "Laporan Mingguan",
    icon_name: "CalendarDays",
    action_type: "function",
    action_value: "report_weekly",
  },
  {
    label: "Laporan Bulanan",
    icon_name: "CalendarRange",
    action_type: "function",
    action_value: "report_monthly",
  },
];

/** Item registrasi khusus ICCU (sama arah migrasi `register_iccu`). */
export const REGISTER_ICCU_SEED: (typeof DEFAULT_JARVIS_MENU_SEED)[0] = {
  label: "REGISTER ICCU",
  icon_name: "Hospital",
  action_type: "function",
  action_value: "register_iccu",
};

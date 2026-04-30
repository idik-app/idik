import { roomDisplayLabelFromSlug } from "@/lib/ruangan/slug";

/**
 * Sama dengan baris `intensive_jarvis_menu` / payload API GET jarvis-menu.
 * Dipakai `JarvisFloatingMenu` + orbital `JarvisFloatingAgent`.
 */
export type IntensiveJarvisMenuItem = {
  id: string;
  label: string;
  icon_name: string;
  action_type: string;
  action_value: string | null;
  order_index: number;
};

export function normalizeIntensiveMenuRow(
  row: Record<string, unknown>,
): IntensiveJarvisMenuItem {
  const n = (v: unknown) => (v == null ? "" : String(v));
  const id = n(row.id);
  const label = n(
    row.label ?? row["Label"] ?? (row as { title?: string }).title,
  );
  const iconName = n(
    row.icon_name ?? row["iconName"] ?? (row as { iconName?: string }).iconName,
  );
  const actionType = n(row.action_type ?? row["actionType"] ?? "function");
  const av = row.action_value ?? row["actionValue"];
  const order =
    row.order_index != null
      ? Number(row.order_index)
      : Number((row as { orderIndex?: number }).orderIndex ?? 0);

  const actionVal =
    av == null || String(av).trim() === "" ? null : String(av).trim();

  return {
    id,
    label: label.trim(),
    icon_name: (iconName || "HelpCircle").trim() || "HelpCircle",
    action_type: (actionType || "function").trim().toLowerCase(),
    action_value: actionVal,
    order_index: Number.isFinite(order) ? order : 0,
  };
}

export function isRegisterRuangItem(item: IntensiveJarvisMenuItem): boolean {
  const av = (item.action_value ?? "").trim().toLowerCase();
  if (
    av === "register_iccu" ||
    av === "register_ruangan" ||
    av === "register_unit"
  ) {
    return true;
  }
  const lab = item.label.trim();
  if (/^\s*register\s+iccu\s*$/i.test(lab)) return true;
  if (/^\s*register\s+pasien\s*$/i.test(lab)) return true;
  if (!av && /^\s*register\s+\S/i.test(lab)) return true;
  return false;
}

export function isHistoryPasienItem(item: IntensiveJarvisMenuItem): boolean {
  const av = (item.action_value ?? "").trim().toLowerCase();
  if (
    av === "history_pasien" ||
    av === "iccu_history" ||
    av === "history_iccu"
  ) {
    return true;
  }
  return /history\s*pasien/i.test(item.label.trim());
}

export function intensiveMenuDisplayLabel(
  item: IntensiveJarvisMenuItem,
  roomNama: string,
  roomSlug: string,
): string {
  if (isRegisterRuangItem(item)) {
    const n = roomNama.trim() || roomDisplayLabelFromSlug(roomSlug);
    return `REGISTER ${n.toUpperCase()}`;
  }
  return item.label;
}

export type IntensiveMenuActionHandlers = {
  onToggleSidebar?: () => void;
  onAddPatient?: () => void;
  onRegisterIccu?: () => void;
  onHistoryPasien?: () => void;
  onOpenReports?: (type: "daily" | "weekly" | "monthly") => void;
  /** Rekapitulasi ICCU — grafik wireframe / laporan bulanan unit. */
  onIccuRekap?: () => void;
  onOpenActionsTable?: () => void;
};

/**
 * Sama dengan perilaku klik item di `JarvisFloatingMenu` (bukan mode edit).
 */
export function runIntensiveJarvisMenuAction(
  item: IntensiveJarvisMenuItem,
  handlers: IntensiveMenuActionHandlers,
): void {
  if (isRegisterRuangItem(item)) {
    handlers.onRegisterIccu?.();
    return;
  }
  if (isHistoryPasienItem(item)) {
    handlers.onHistoryPasien?.();
    return;
  }

  const avLower = (item.action_value ?? "").trim().toLowerCase();

  switch (item.action_type) {
    case "sidebar_toggle":
      handlers.onToggleSidebar?.();
      break;
    case "function":
      if (avLower === "add_patient") handlers.onAddPatient?.();
      else if (avLower === "actions_table") handlers.onOpenActionsTable?.();
      else if (
        avLower === "laporan_iccu_rekap" ||
        avLower === "iccu_rekap" ||
        avLower === "rekap_iccu"
      ) {
        handlers.onIccuRekap?.();
      } else if (item.action_value?.startsWith("report_")) {
        const type = item.action_value.split("_")[1] as
          | "daily"
          | "weekly"
          | "monthly";
        handlers.onOpenReports?.(type);
      }
      break;
    case "link":
      if (item.action_value) window.open(item.action_value, "_blank");
      break;
  }
}

/** Event agar `JarvisFloatingAgent` memicu aksi yang sama tanpa properti callback. */
export const IDIK_INTENSIVE_JARVIS_ORBIT_EVENT = "idik:intensive-jarvis-orbit" as const;

/** Tutup orbital / reset agen (mis. saat modal intensive di atasnya dibuka). */
export const IDIK_JARVIS_FLOATING_CLOSE_EVENT = "idik:jarvis-floating-close" as const;

export type IntensiveJarvisOrbitDetail = {
  item: IntensiveJarvisMenuItem;
  roomSlug: string;
};

const RESERVED_PATH_TOP = new Set([
  "api",
  "_next",
  "static",
  "dashboard",
  "system",
  "login",
  "distributor",
  "depo",
  "cssd",
  "favicon.ico",
  "intensive",
]);

type MinimalRoom = { slug: string };

/**
 * `/{unit}/dashboard` → slug unit. `/intensive/dashboard` → infer dari daftar akses.
 */
export function getIntensiveJarvisContextSlug(
  pathname: string | null,
  accessibleRooms: MinimalRoom[],
): string | null {
  if (!pathname) return null;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[1] === "dashboard") {
    const seg = parts[0].toLowerCase();
    if (!RESERVED_PATH_TOP.has(seg)) return seg;
  }
  if (parts[0] === "intensive" && parts[1] === "dashboard" && accessibleRooms.length > 0) {
    return accessibleRooms[0]!.slug.trim().toLowerCase();
  }
  return null;
}

export const JARVIS_ORBIT_COLOR_CYCLE = [
  "#22d3ee",
  "#a855f7",
  "#eab308",
  "#10b981",
  "#f43f5e",
  "#6366f1",
  "#f97316",
  "#ec4899",
] as const;

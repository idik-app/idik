/**
 * Katalog field bot dari wireframe drawer + Fast-Track + sign times.
 */

import {
  FIELD_LABELS,
  WIREFRAME_DRAWER_TABS,
  type WireframeTabId,
} from "@/app/dashboard/layanan/tindakan/bridge/wireframeDrawerTabs";

export const FAST_TRACK_BOT_FIELDS = [
  "pasien_datang_igd",
  "door_to_balloon",
  "fast_track_sign_in",
  "fast_track_time_out",
  "fast_track_sign_out",
] as const;

export const SIGN_TIME_FIELDS = [
  "fast_track_sign_in",
  "fast_track_time_out",
  "fast_track_sign_out",
] as const;

export type BotCatalogField = {
  field_key: string;
  label: string;
  tab: WireframeTabId | "fast_track";
};

export function buildBotCatalog(): BotCatalogField[] {
  const out: BotCatalogField[] = [];
  const seen = new Set<string>();

  for (const tab of WIREFRAME_DRAWER_TABS) {
    const keys =
      tab.id === "fast_track"
        ? [...FAST_TRACK_BOT_FIELDS]
        : tab.id === "tindakan"
          ? [...tab.fields, ...SIGN_TIME_FIELDS]
          : [...tab.fields];

    for (const key of keys) {
      if (seen.has(key)) continue;
      // Skip fields typically not scraped from SIMRS as identity defaults
      if (key === "umur" || key === "total_waktu_fast_track") continue;
      seen.add(key);
      out.push({
        field_key: key,
        label: FIELD_LABELS[key] ?? key,
        tab: tab.id,
      });
    }
  }

  return out;
}

export function isEmptyBotValue(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  const s = String(val).trim();
  return s === "" || s === "—" || s === "-";
}

export function listEmptyBotFields(
  record: Record<string, unknown>,
): BotCatalogField[] {
  return buildBotCatalog().filter((f) => isEmptyBotValue(record[f.field_key]));
}

export function groupEmptyByTab(
  empty: BotCatalogField[],
): { tab: string; tabLabel: string; fields: BotCatalogField[] }[] {
  const tabLabel = new Map(
    WIREFRAME_DRAWER_TABS.map((t) => [t.id, t.label] as const),
  );
  const order = WIREFRAME_DRAWER_TABS.map((t) => t.id);
  const groups = new Map<string, BotCatalogField[]>();
  for (const f of empty) {
    const list = groups.get(f.tab) || [];
    list.push(f);
    groups.set(f.tab, list);
  }
  return order
    .filter((id) => groups.has(id))
    .map((id) => ({
      tab: id,
      tabLabel: tabLabel.get(id) || id,
      fields: groups.get(id)!,
    }));
}

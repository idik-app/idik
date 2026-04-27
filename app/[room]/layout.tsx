import { RoomProvider, type RoomContextType } from "@/app/contexts/RoomContext";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";

/** Fallback bila Supabase tidak terbaca — tetap selaras dengan seed multi-unit. */
const LEGACY_ROOM_CONFIG: Record<string, RoomContextType> = {
  icu: {
    slug: "icu",
    capabilities: { flowsheet: true, ventilator: true, medication: true },
    branding: { primaryColor: "#ef4444", displayName: "Intensive Care Unit" },
    clinical_config: {
      thresholds: { hr: { min: 60, max: 100 }, bp_s: { min: 90, max: 140 }, spo2: { min: 94 } },
    },
  },
  idik: {
    slug: "idik",
    capabilities: { flowsheet: true, catheter: true },
    branding: { primaryColor: "#3b82f6", displayName: "IDIK / Cathlab" },
    clinical_config: { thresholds: { hr: { min: 50, max: 120 } } },
  },
  iccu: {
    slug: "iccu",
    capabilities: { flowsheet: true, cardiac: true },
    branding: { primaryColor: "#dc2626", displayName: "ICCU" },
    clinical_config: { thresholds: { hr: { min: 50, max: 110 } } },
  },
  hcu: {
    slug: "hcu",
    capabilities: { flowsheet: true },
    branding: { primaryColor: "#f59e0b", displayName: "HCU" },
    clinical_config: { thresholds: { hr: { min: 60, max: 100 } } },
  },
  micu: {
    slug: "micu",
    capabilities: { flowsheet: true, ventilator: true },
    branding: { primaryColor: "#8b5cf6", displayName: "MICU" },
    clinical_config: { thresholds: { hr: { min: 60, max: 100 } } },
  },
  su: {
    slug: "su",
    capabilities: { flowsheet: true, neurology: true },
    branding: { primaryColor: "#10b981", displayName: "Stroke Unit" },
    clinical_config: { thresholds: { hr: { min: 60, max: 100 } } },
  },
  igd: {
    slug: "igd",
    capabilities: { flowsheet: true },
    branding: { primaryColor: "#f97316", displayName: "IGD" },
    clinical_config: {},
  },
  "rawat-inap": {
    slug: "rawat-inap",
    capabilities: { flowsheet: true },
    branding: { primaryColor: "#64748b", displayName: "Rawat Inap" },
    clinical_config: {},
  },
};

async function getRoomConfig(slug: string): Promise<RoomContextType | null> {
  const key = slug.trim().toLowerCase();
  if (!key) return null;

  try {
    const supabase = createAdminClient(true);
    const { data, error } = await supabase
      .from("ruangan")
      .select("slug, nama, branding, capabilities, clinical_config, aktif")
      .eq("slug", key)
      .maybeSingle();

    if (!error && data && data.aktif !== false && data.slug) {
      const branding = (data.branding as Record<string, unknown>) || {};
      const capabilitiesRaw =
        (data.capabilities as Record<string, boolean>) || {};
      const clinicalRaw =
        (data.clinical_config as RoomContextType["clinical_config"]) || {};

      const primary =
        typeof branding.primaryColor === "string"
          ? branding.primaryColor
          : "#3b82f6";
      const displayName =
        typeof branding.displayName === "string"
          ? branding.displayName
          : String(data.nama || data.slug);

      return {
        slug: String(data.slug),
        capabilities: { flowsheet: true, ...capabilitiesRaw },
        branding: { primaryColor: primary, displayName },
        clinical_config: { ...clinicalRaw },
      };
    }
  } catch {
    // gunakan fallback di bawah
  }

  return LEGACY_ROOM_CONFIG[key] ?? null;
}

export default async function RoomLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ room: string }>;
}) {
  const { room } = await params;
  const config = await getRoomConfig(room);

  if (!config) {
    notFound();
  }

  return (
    <RoomProvider slug={room} config={config}>
      <main className="min-h-screen bg-zinc-950 text-zinc-100 dark:text-white">
        <div
          className="h-1 w-full"
          style={{ backgroundColor: config.branding.primaryColor }}
        />
        {children}
      </main>
    </RoomProvider>
  );
}

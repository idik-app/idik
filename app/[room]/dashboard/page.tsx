import IntensiveDashboardView from "@/components/intensive/IntensiveDashboardView";

type PageProps = {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ tindakanId?: string }>;
};

export default async function GenericUnitDashboardPage({ 
  params, 
  searchParams 
}: PageProps) {
  const { room } = await params;
  const sp = await searchParams;
  const tid = typeof sp.tindakanId === "string" ? sp.tindakanId.trim() : "";

  return (
    <IntensiveDashboardView
      tindakanId={tid || undefined}
      patientHeadline={undefined}
      roomSlug={room}
      inferPrimaryUnitFromAccess={false}
      autoOpenJarvisMenu
    />
  );
}

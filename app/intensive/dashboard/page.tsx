import IntensiveDashboardView from "@/components/intensive/IntensiveDashboardView";

type PageProps = {
  searchParams: Promise<{ tindakanId?: string }>;
};

export default async function IntensiveDashboardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tid =
    typeof sp.tindakanId === "string" ? sp.tindakanId.trim() : "";
  return (
    <IntensiveDashboardView
      tindakanId={tid || undefined}
      patientHeadline={undefined}
    />
  );
}

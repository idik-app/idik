import IntensiveDashboardView from "@/components/intensive/IntensiveDashboardView";
import { requireUser } from "@/lib/auth/guards";

type PageProps = {
  searchParams: Promise<{ tindakanId?: string }>;
};

export default async function IntensiveDashboardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tid =
    typeof sp.tindakanId === "string" ? sp.tindakanId.trim() : "";

  const auth = await requireUser();
  const fromJwt =
    auth.ok &&
    auth.ruanganSlug != null &&
    String(auth.ruanganSlug).trim().length > 0
      ? String(auth.ruanganSlug).trim().toLowerCase()
      : null;
  const roomSlug = fromJwt ?? "idik";

  return (
    <IntensiveDashboardView
      tindakanId={tid || undefined}
      patientHeadline={undefined}
      roomSlug={roomSlug}
      /** Jika JWT belum bawa slug (mis. Supabase), coba pakai satu-satunya ruangan dari API akses. */
      inferPrimaryUnitFromAccess={fromJwt == null}
      autoOpenJarvisMenu
    />
  );
}

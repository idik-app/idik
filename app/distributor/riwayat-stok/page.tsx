import { redirect } from "next/navigation";

/** URL lama menu riwayat mutasi — dialihkan ke /distributor/riwayat */
export default async function RiwayatStokRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ distributor_id?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.distributor_id
    ? `?distributor_id=${encodeURIComponent(sp.distributor_id)}`
    : "";
  redirect(`/distributor/riwayat${q}`);
}

import FarmasiModulePlaceholder from "@/components/farmasi/FarmasiModulePlaceholder";

type Props = {
  params: Promise<{ slug?: string[] }>;
};

export default async function FarmasiFallbackPage({ params }: Props) {
  const { slug } = await params;
  return <FarmasiModulePlaceholder slug={slug ?? []} />;
}

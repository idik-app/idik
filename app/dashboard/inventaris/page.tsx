"use client";
import dynamic from "next/dynamic";
import LoadingShimmer from "@/components/LoadingShimmer";

// ⏳ Dynamic import konten inventaris
const InventarisContent = dynamic(
  () => import("@/components/InventarisContent"),
  {
    loading: () => <LoadingShimmer />,
    ssr: false,
  }
);

export default function InventarisPage() {
  return (
    <div className="min-h-screen px-3 sm:px-6 py-4">
      <InventarisContent />
    </div>
  );
}

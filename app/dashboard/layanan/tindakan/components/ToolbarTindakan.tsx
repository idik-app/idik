"use client";
import { Button } from "@/components/ui/button";

export default function TindakanToolbar({
  onRefresh,
  isLoading,
}: {
  onRefresh: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between bg-black/30 border border-cyan-900/40 rounded-xl px-4 py-3 backdrop-blur-sm">
      <div className="text-gray-400 text-sm">Filter tindakan / Dokter</div>
      <Button
        variant="outline"
        onClick={onRefresh}
        disabled={isLoading}
        className="border-cyan-700 text-cyan-300 hover:bg-cyan-800/40"
      >
        {isLoading ? "Menyegarkan..." : "Segarkan Data"}
      </Button>
    </div>
  );
}

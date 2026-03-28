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
    <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between bg-black/30 border border-cyan-900/40 rounded-xl px-3 py-3 sm:px-4 backdrop-blur-sm min-w-0">
      <div className="text-gray-400 text-xs sm:text-sm min-w-0">
        Filter tindakan / Dokter
      </div>
      <Button
        variant="outline"
        onClick={onRefresh}
        disabled={isLoading}
        className="border-cyan-700 text-cyan-300 hover:bg-cyan-800/40 w-full min-[480px]:w-auto shrink-0"
      >
        {isLoading ? "Menyegarkan..." : "Segarkan Data"}
      </Button>
    </div>
  );
}

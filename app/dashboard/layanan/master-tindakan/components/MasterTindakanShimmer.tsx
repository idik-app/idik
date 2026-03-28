"use client";

export default function MasterTindakanShimmer() {
  return (
    <div className="animate-pulse space-y-3 mt-6">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-md bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800"
        />
      ))}
    </div>
  );
}

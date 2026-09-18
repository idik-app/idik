"use client";

import StokOpnameSessionView from "@/components/stok-opname/StokOpnameSessionView";
import StokOpnameErrorBoundary from "@/components/stok-opname/StokOpnameErrorBoundary";

export default function DepoStokOpnamePage() {
  return (
    <StokOpnameErrorBoundary>
      <div className="p-2 sm:p-4 max-w-7xl mx-auto space-y-6">
        <StokOpnameSessionView />
      </div>
    </StokOpnameErrorBoundary>
  );
}

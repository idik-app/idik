"use client";

import { MasterTindakanProvider } from "./contexts/MasterTindakanContext";
import MasterTindakanContent from "./components/MasterTindakanContent";

export default function MasterTindakanPage() {
  return (
    <MasterTindakanProvider>
      <div className="min-h-full min-w-0 px-3 sm:px-6 py-4">
        <MasterTindakanContent />
      </div>
    </MasterTindakanProvider>
  );
}

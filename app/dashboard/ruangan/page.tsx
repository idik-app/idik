"use client";

import { RuanganProvider } from "./contexts/RuanganContext";
import RuanganContent from "./components/RuanganContent";

export default function RuanganPage() {
  return (
    <RuanganProvider>
      <div className="min-h-screen px-3 sm:px-6 py-4">
        <RuanganContent />
      </div>
    </RuanganProvider>
  );
}

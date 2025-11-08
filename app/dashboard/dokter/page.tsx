"use client";

import { DokterProvider } from "./contexts/DokterContext";
import DokterContent from "./components/DokterContent";

export default function DokterPage() {
  return (
    <DokterProvider>
      <div className="min-h-screen px-3 sm:px-6 py-4">
        <DokterContent />
      </div>
    </DokterProvider>
  );
}

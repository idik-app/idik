"use client";
import { useState, useEffect } from "react";
import { PasienProvider } from "./contexts/PasienContext";
import PasienContent from "./PasienContent";
import JarvisScanner from "@/components/effects/JarvisScanner";

export default function PasienPage() {
  const [isActive, setIsActive] = useState(true);
  useEffect(() => {
    setIsActive(true);
    const timer = setTimeout(() => setIsActive(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <PasienProvider>
      <div
        className="relative min-h-full min-w-0 overflow-x-hidden bg-gradient-to-br
                   from-black via-gray-900 to-cyan-950
                   p-6 space-y-6"
      >
        <div className="absolute inset-0 z-0 pointer-events-none">
          <JarvisScanner isActive={isActive} />
        </div>
        <div className="relative z-10">
          <PasienContent />
        </div>
      </div>
    </PasienProvider>
  );
}

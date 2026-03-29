"use client";
import { useState, useEffect } from "react";
import DashboardMain from "@/components/dashboard/DashboardMain";
import JarvisScanner from "@/components/effects/JarvisScanner";

export default function DashboardPage() {
  const [isActive, setIsActive] = useState(true);
  useEffect(() => {
    setIsActive(true);
    const timer = setTimeout(() => setIsActive(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="relative min-h-full min-w-0 overflow-x-hidden bg-gradient-to-br
                 from-black via-gray-900 to-cyan-950
                 p-6 space-y-6"
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <JarvisScanner isActive={isActive} />
      </div>
      <div className="relative z-10">
        <DashboardMain />
      </div>
    </div>
  );
}

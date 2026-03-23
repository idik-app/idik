"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AutonomousKernel } from "./AutonomousKernel";

const KernelContext = createContext<AutonomousKernel | null>(null);

export function AutonomousKernelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [kernel] = useState(() => new AutonomousKernel());

  useEffect(() => {
    kernel.boot();
    return () => kernel.shutdown();
  }, [kernel]);

  return (
    <KernelContext.Provider value={kernel}>{children}</KernelContext.Provider>
  );
}

export function useAutonomousKernel() {
  const ctx = useContext(KernelContext);
  if (!ctx) throw new Error("useAutonomousKernel must be inside provider");
  return ctx;
}

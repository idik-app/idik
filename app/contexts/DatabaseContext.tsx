"use client";

import { createContext, useContext, useState } from "react";

type DatabaseContextType = {
  activeTable: string | null;
  setActiveTable: (table: string | null) => void;
  latency: number | null;
  setLatency: (value: number | null) => void;
  cached: boolean;
  setCached: (value: boolean) => void;
};

const DatabaseContext = createContext<DatabaseContextType | undefined>(
  undefined
);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [cached, setCached] = useState(false);

  return (
    <DatabaseContext.Provider
      value={{
        activeTable,
        setActiveTable,
        latency,
        setLatency,
        cached,
        setCached,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context)
    throw new Error("useDatabase must be used within DatabaseProvider");
  return context;
}

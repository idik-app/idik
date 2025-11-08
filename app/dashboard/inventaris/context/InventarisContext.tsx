"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type Item = {
  id: string;
  namaBarang: string;
  lot: string;
  ukuran: string;
  stok: number;
  ed: string;
  status: "new" | "reuse";
  vendor?: string;
};

type InventarisContextType = {
  items: Item[];
  pendingDelete: Item | null;
  requestDeleteItem: (id: string) => void;
  confirmDeleteItem: () => void;
  cancelDeleteItem: () => void;
};

const InventarisContext = createContext<InventarisContextType | null>(null);

export function InventarisProvider({ children }: { children: ReactNode }) {
  // 💾 Dummy data awal (bisa diganti fetch Supabase nanti)
  const [items, setItems] = useState<Item[]>([
    {
      id: "1",
      namaBarang: "SUPRAFLEX 3.0 x 28",
      lot: "(10)P25TZAELAB",
      ukuran: "3.0 x 28",
      stok: 4,
      ed: "2027-04-01",
      status: "new",
      vendor: "PT Biosensors",
    },
    {
      id: "2",
      namaBarang: "MICROCATETER Finecross",
      lot: "FCX-001A",
      ukuran: "150cm",
      stok: 2,
      ed: "2026-12-01",
      status: "reuse",
      vendor: "PT Medtronic",
    },
  ]);

  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);

  const requestDeleteItem = (id: string) => {
    const found = items.find((i) => i.id === id) || null;
    setPendingDelete(found);
  };

  const confirmDeleteItem = () => {
    if (pendingDelete) {
      setItems((prev) => prev.filter((i) => i.id !== pendingDelete.id));
      setPendingDelete(null);
    }
  };

  const cancelDeleteItem = () => setPendingDelete(null);

  return (
    <InventarisContext.Provider
      value={{
        items,
        pendingDelete,
        requestDeleteItem,
        confirmDeleteItem,
        cancelDeleteItem,
      }}
    >
      {children}
    </InventarisContext.Provider>
  );
}

export function useInventaris() {
  const ctx = useContext(InventarisContext);
  if (!ctx)
    throw new Error("useInventaris must be used within an InventarisProvider");
  return ctx;
}

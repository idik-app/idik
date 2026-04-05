"use client";

import { useState, useEffect, useCallback } from "react";
import { hospitalDirectory, type HospitalUnit } from "../constants/phone-directory";

const STORAGE_KEY = "idik_phone_directory";

export function usePhoneDirectory() {
  const [data, setData] = useState<HospitalUnit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize data from localStorage or constants
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse phone directory from storage", e);
        setData(hospitalDirectory);
      }
    } else {
      setData(hospitalDirectory);
    }
    setIsLoaded(true);
  }, []);

  // Autosave whenever data changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isLoaded]);

  const updateEntry = useCallback((id: string, updates: Partial<HospitalUnit>) => {
    setData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setData((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addEntry = useCallback((entry: Omit<HospitalUnit, "id">) => {
    const newId = Math.random().toString(36).substr(2, 9);
    setData((prev) => [...prev, { ...entry, id: newId }]);
  }, []);

  const togglePin = useCallback((id: string) => {
    setData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isPinned: !item.isPinned } : item
      )
    );
  }, []);

  const reorderPins = useCallback((reorderedPins: HospitalUnit[]) => {
    setData((prev) => {
      const nonPinned = prev.filter((item) => !item.isPinned);
      return [...reorderedPins, ...nonPinned];
    });
  }, []);

  const pinnedItems = data.filter((item) => item.isPinned);

  return {
    data,
    pinnedItems,
    updateEntry,
    deleteEntry,
    addEntry,
    togglePin,
    reorderPins,
    isLoaded,
  };
}

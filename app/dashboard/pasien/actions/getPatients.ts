"use client";
import { useEffect, useState } from "react";
import { refreshPatients } from "./refreshPatients";

type GetPatientsResult = { ok: true; data: any[] } | { ok: false; message: string };

async function getPatientsClient(): Promise<GetPatientsResult> {
  try {
    const data = await refreshPatients();
    return { ok: true, data: data as any[] };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Failed to load patients" };
  }
}

export function usePatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const res = await getPatientsClient();
      if (res.ok) {
        setPatients(res.data);
        setIsLive(true);
      } else {
        setPatients([]);
        setIsLive(false);
      }
      setIsLoading(false);
    }
    fetchData();
  }, []);

  return { patients, isLive, isLoading };
}

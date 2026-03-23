"use client";

export function usePasienRealtime() {
  console.log("📴 Realtime pasien: subscribe no-op (nonaktif)");
  return { subscribe: () => () => {} };
}

"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { PasienContext } from "../../../contexts/PasienProvider";
import { useNotification } from "@/contexts/NotificationContext";

/**
 * 🧩 useToolbarLogic v4.1 — Pagination-ready Hook
 */
export function useToolbarLogic() {
  const context = useContext(PasienContext);
  if (!context)
    throw new Error("useToolbarLogic must be used within PasienProvider");

  const { state, dispatch } = context;
  const { filteredPatients, summary, currentPage, perPage } = state;

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / perPage));
  const { show } = useNotification();

  const [filterState, setFilterState] = useState({
    search: "",
    pembiayaan: "Semua",
    kelas: "Semua",
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!summary?.lastSync || summary.lastSync === "—") return;
    setIsSyncing(true);
    const t = setTimeout(() => setIsSyncing(false), 1000);
    return () => clearTimeout(t);
  }, [summary?.lastSync, filteredPatients, filterState, perPage]);

  useEffect(() => {
    const handleActivity = () => {
      setIsIdle(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIsIdle(true), 15000);
    };
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    handleActivity();
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  const handlePageChange = (page: number) =>
    dispatch({ type: "SET_PAGE", payload: page });

  const handlePerPage = (val: number) =>
    dispatch({ type: "SET_PER_PAGE", payload: val });

  const handleFilter = (params?: { key?: string; value?: string }) => {
    if (params?.key) {
      setFilterState((prev) => ({
        ...prev,
        [params.key as keyof typeof prev]: params.value ?? "",
      }));
    }
    dispatch({
      type: "APPLY_FILTER",
      payload: {
        search: params?.key === "search" ? params.value : filterState.search,
        pembiayaan:
          params?.key === "pembiayaan" ? params.value : filterState.pembiayaan,
        kelas: params?.key === "kelas" ? params.value : filterState.kelas,
      },
    });
    show({ type: "info", message: "Filter diperbarui." });
  };

  return {
    summary,
    filterState,
    currentPage,
    totalPages,
    perPage,
    isSyncing,
    isIdle,
    handlePageChange,
    handlePerPage,
    handleFilter,
  };
}

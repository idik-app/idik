// ========================================================================
// ⚡ useTindakanBridgeAdapter.ts — SUPREME FINAL v4.0
// Realtime + CRUD + Mapping + Bridge Events (100% Null-Safe)
// ========================================================================

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

import { useTindakanEventBridge } from "./useTindakanEventBridge";
import { mapToDetail } from "./mapToDetail";
import { mapToEditor } from "./mapToEditor";
import { mapToTableRow } from "./mapToTableRow";

import { TINDAKAN_OPEN_DETAIL, TINDAKAN_REFRESH } from "./bridge.events";

import { TindakanJoinResult } from "./mapping.types";

// Domain hooks
import { useTindakanData } from "../hooks/useTindakanData";
import { useTindakanCrud } from "../hooks/useTindakanCrud";

function findTindakanRow(list: unknown[], id: string) {
  return (list as any[]).find(
    (r: any) => r != null && String(r.id ?? "") === String(id),
  );
}

export function useTindakanBridgeAdapter() {
  // --------------------------------------------------------------------
  // SERVER FILTERS (Date Range)
  // Default: Awal bulan ini (WIB)
  // --------------------------------------------------------------------
  const [serverFilters, setServerFilters] = useState<{
    from?: string;
    to?: string;
    search?: string;
  }>(() => {
    const now = new Date();
    // Gunakan Intl untuk memastikan zona waktu Asia/Jakarta
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const today = formatter.format(now);
    const startOfMonth = today.substring(0, 8) + "01";
    return { from: startOfMonth };
  });

  // --------------------------------------------------------------------
  // BRIDGE SYSTEM
  // --------------------------------------------------------------------
  const bridge = useTindakanEventBridge();
  const [detailOpenId, setDetailOpenId] = useState<string | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<string | null>(null);

  // --------------------------------------------------------------------
  // DOMAIN HOOKS (selalu aman → default fallback)
  // --------------------------------------------------------------------
  const {
    tindakanList = [], // Fallback aman
    loading = false,
    error = null,
    reload,
    removeLocalById,
    isSyncing = false,
  } = useTindakanData(serverFilters);

  const { createOne, updateOne, deleteOne } = useTindakanCrud();

  // --------------------------------------------------------------------
  // TABLE ROW (NULL SAFE)
  // --------------------------------------------------------------------
  const tableRows = useMemo(() => {
    if (!Array.isArray(tindakanList)) return [];
    return tindakanList.map((item: TindakanJoinResult, i: number) =>
      mapToTableRow(item, i),
    );
  }, [tindakanList]);

  const openDetail = useCallback(
    (rowId: string, initialTab?: string) => {
      bridge.emitOpenDetail(rowId, initialTab);
    },
    [bridge],
  );

  const openEditor = useCallback(
    (rowId: string) => {
      bridge.emitOpenEditor(rowId);
    },
    [bridge],
  );

  const saveEditor = useCallback(
    async (id: string, updatedData: unknown) => {
      await updateOne(id, updatedData);
      bridge.emitEdited({ id, updatedData });
      await reload({ silent: true });
    },
    [bridge, reload, updateOne],
  );

  const createRecord = useCallback(
    async (payload: unknown) => {
      const created = await createOne(payload as Record<string, unknown>);
      bridge.emitEdited({
        id: String((created as { id?: string } | null)?.id ?? ""),
        created: true,
      });
      await reload({ silent: true });
      return created;
    },
    [bridge, createOne, reload],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      await deleteOne(id);
      removeLocalById(id);
      bridge.emitEdited({ id, deleted: true });
      await reload({ silent: true });
    },
    [bridge, deleteOne, reload, removeLocalById],
  );

  const refresh = useCallback(() => reload({ silent: true }), [reload]);

  // --------------------------------------------------------------------
  // LISTENER: REFRESH SIGNAL
  // --------------------------------------------------------------------
  useEffect(() => {
    const unsub = bridge.on(TINDAKAN_REFRESH, () => {
      void reload({ silent: true });
    });
    return () => unsub();
  }, [bridge, reload]);

  useEffect(() => {
    const unsub = bridge.on(TINDAKAN_OPEN_DETAIL, (p: { id?: string; tab?: string }) => {
      if (p?.id) {
        setDetailOpenId(String(p.id));
        if (p.tab) {
          setDetailInitialTab(p.tab);
        } else {
          setDetailInitialTab(null);
        }
      }
    });
    return () => unsub();
  }, [bridge]);

  const closeDetailDrawer = useCallback(() => {
    setDetailOpenId(null);
    setDetailInitialTab(null);
  }, []);

  // --------------------------------------------------------------------
  // DETAIL PANEL STATE BUILDER
  // --------------------------------------------------------------------
  const getDetailView = (id: string) => {
    const row = findTindakanRow(tindakanList, id);
    if (!row) return null;
    return mapToDetail(row);
  };

  // --------------------------------------------------------------------
  // EDITOR PANEL STATE BUILDER
  // --------------------------------------------------------------------
  const getEditorState = (id: string) => {
    const row = findTindakanRow(tindakanList, id);
    if (!row) return null;
    return mapToEditor(row);
  };

  const selectedRecord = useMemo(
    () => (detailOpenId ? findTindakanRow(tindakanList, detailOpenId) : null),
    [tindakanList, detailOpenId],
  );

  // --------------------------------------------------------------------
  // FINAL RETURN (CLEAN)
  // --------------------------------------------------------------------
  return {
    tableRows,
    /** Baris mentah Supabase — untuk tampilan tab / kartu (tanpa spreadsheet) */
    tindakanList,
    loading,
    error,
    isSyncing,

    // interactions
    openDetail,
    openEditor,
    saveEditor,
    createRecord,
    deleteRecord,
    /** Muat ulang data di latar tanpa layar loading (polling / sinkron). */
    refresh,

    // mapping
    getDetailView,
    getEditorState,

    detailOpenId,
    detailInitialTab,
    closeDetailDrawer,
    selectedRecord,

    // Server-side filtering
    serverFilters,
    setServerFilters,
  };
}

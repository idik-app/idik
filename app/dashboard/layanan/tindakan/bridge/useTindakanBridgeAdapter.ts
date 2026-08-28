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
  // Tanggal disinkronkan dari toolbar TindakanTable → API ?from=&to= (maks. 2000 baris).
  // --------------------------------------------------------------------
  const [serverFilters, setServerFilters] = useState<{
    from?: string;
    to?: string;
    search?: string;
    limit?: number;
  }>({});

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
    addLocalRow,
    patchLocalRow,
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
      if (updatedData && typeof updatedData === "object") {
        patchLocalRow(id, updatedData as Record<string, unknown>);
      }
      bridge.emitEdited({ id, updatedData });
      
      await updateOne(id, updatedData);
    },
    [bridge, updateOne, patchLocalRow],
  );

  const createRecord = useCallback(
    async (payload: unknown) => {
      const created = await createOne(payload as Record<string, unknown>);
      const id = String((created as { id?: string } | null)?.id ?? "");
      bridge.emitEdited({
        id,
        created: true,
      });
      if (id) {
        addLocalRow({
          id,
          ...(payload as Record<string, unknown>),
          created_at: new Date().toISOString(),
        });
      }
      await reload({ silent: true });
      return created;
    },
    [bridge, createOne, addLocalRow, reload],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      await deleteOne(id);
      removeLocalById(id);
      bridge.emitEdited({ id, deleted: true });
    },
    [bridge, deleteOne, removeLocalById],
  );

  const refresh = useCallback(
    (options?: { silent?: boolean; force?: boolean }) =>
      reload({ silent: options?.silent ?? true, force: options?.force }),
    [reload],
  );

  /** Sesudah autosave (Biaya, dll.): patch baris di memori dulu agar tabel/drawer respons cepat, lalu SWR silent. */
  const syncListAfterAutosave = useCallback(
    (info?: { tindakanId: string; field: string; value: unknown }) => {
      if (
        info &&
        typeof info.tindakanId === "string" &&
        typeof info.field === "string"
      ) {
        const id = info.tindakanId.trim();
        const field = info.field.trim();
        if (id && field) {
          patchLocalRow(id, { [field]: info.value });
        }
      }
      void reload({ silent: true });
    },
    [patchLocalRow, reload],
  );

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
    const unsub = bridge.on(TINDAKAN_OPEN_DETAIL, (payload: unknown) => {
      const p = payload as { id?: string; tab?: string };
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
    /** PATCH biaya/autosave: optimistik ke list + revalidate silent (kolom Perolehan BPJS ↔ drawer). */
    syncListAfterAutosave,

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
    patchLocalRow,
  };
}

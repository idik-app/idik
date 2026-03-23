// ========================================================================
// ⚡ useTindakanBridgeAdapter.ts — SUPREME FINAL v4.0
// Realtime + CRUD + Mapping + Bridge Events (100% Null-Safe)
// ========================================================================

"use client";

import { useEffect, useMemo } from "react";

import { useTindakanEventBridge } from "./useTindakanEventBridge";
import { mapToDetail } from "./mapToDetail";
import { mapToEditor } from "./mapToEditor";
import { mapToTableRow } from "./mapToTableRow";

import {
  TINDAKAN_OPEN_DETAIL,
  TINDAKAN_OPEN_EDITOR,
  TINDAKAN_REFRESH,
  TINDAKAN_CHANGED,
} from "./bridge.events";

import { TindakanJoinResult } from "./mapping.types";

// Domain hooks
import { useTindakanData } from "../hooks/useTindakanData";
import { useTindakanCrud } from "../hooks/useTindakanCrud";
import { useTindakanRealtime } from "../hooks/useTindakanRealtime";

export function useTindakanBridgeAdapter() {
  // --------------------------------------------------------------------
  // BRIDGE SYSTEM
  // --------------------------------------------------------------------
  const bridge = useTindakanEventBridge();

  // --------------------------------------------------------------------
  // DOMAIN HOOKS (selalu aman → default fallback)
  // --------------------------------------------------------------------
  const {
    tindakanList = [], // Fallback aman
    loading = false,
    error = null,
    reload,
  } = useTindakanData();

  const { updateOne, deleteOne } = useTindakanCrud();
  useTindakanRealtime(); // realtime → update otomatis

  // --------------------------------------------------------------------
  // TABLE ROW (NULL SAFE)
  // --------------------------------------------------------------------
  const tableRows = useMemo(() => {
    if (!Array.isArray(tindakanList)) return [];
    return tindakanList.map((item: TindakanJoinResult, i: number) =>
      mapToTableRow(item, i)
    );
  }, [tindakanList]);

  // --------------------------------------------------------------------
  // OPEN DETAIL
  // --------------------------------------------------------------------
  const openDetail = (rowId: string) => {
    bridge.emitOpenDetail(rowId);
  };

  // --------------------------------------------------------------------
  // OPEN EDITOR
  // --------------------------------------------------------------------
  const openEditor = (rowId: string) => {
    bridge.emitOpenEditor(rowId);
  };

  // --------------------------------------------------------------------
  // SAVE EDITOR
  // --------------------------------------------------------------------
  const saveEditor = async (id: string, updatedData: any) => {
    await updateOne(id, updatedData);
    bridge.emitEdited({ id, updatedData });
    reload();
  };

  // --------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------
  const deleteRecord = async (id: string) => {
    await deleteOne(id);
    bridge.emitEdited({ id, deleted: true });
    reload();
  };

  // --------------------------------------------------------------------
  // LISTENER: REFRESH SIGNAL
  // --------------------------------------------------------------------
  useEffect(() => {
    const unsub = bridge.on(TINDAKAN_REFRESH, () => reload());
    return () => unsub();
  }, [bridge, reload]);

  // --------------------------------------------------------------------
  // DETAIL PANEL STATE BUILDER
  // --------------------------------------------------------------------
  const getDetailView = (id: string) => {
    const row = tindakanList.find((r: any) => String(r.no_rm) === id);
    if (!row) return null;
    return mapToDetail(row);
  };

  // --------------------------------------------------------------------
  // EDITOR PANEL STATE BUILDER
  // --------------------------------------------------------------------
  const getEditorState = (id: string) => {
    const row = tindakanList.find((r: any) => String(r.no_rm) === id);
    if (!row) return null;
    return mapToEditor(row);
  };

  // --------------------------------------------------------------------
  // FINAL RETURN (CLEAN)
  // --------------------------------------------------------------------
  return {
    tableRows,
    loading,
    error,

    // interactions
    openDetail,
    openEditor,
    saveEditor,
    deleteRecord,
    refresh: reload,

    // mapping
    getDetailView,
    getEditorState,
  };
}

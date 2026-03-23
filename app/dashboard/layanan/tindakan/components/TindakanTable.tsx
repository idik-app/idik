"use client";

import { useMemo, useState, useEffect, useRef } from "react";

/* CORE */
import { useTindakanBridgeAdapter } from "../bridge/useTindakanBridgeAdapter";

/* UI COMPONENTS */
import TableContainer from "../components/TableContainer";
import TableToolbar from "../components/TableToolbar";
import TablePagination from "../components/TablePagination";

/* SPREADSHEET */
import SpreadsheetHeader from "./spreadsheet-lite/core/SpreadsheetHeader";
import { useSpreadsheetColumns } from "./spreadsheet-lite/core/useSpreadsheetColumns";
import { useSpreadsheetRows } from "./spreadsheet-lite/core/useSpreadsheetRows";

/* VIRTUALIZED (V7) */
import VirtualizedList from "./spreadsheet-lite/engine/VirtualizedList";
import SpreadsheetRowVirtual from "./spreadsheet-lite/core/SpreadsheetRowVirtual";
import CinematicGridLayer from "./spreadsheet-lite/effects/CinematicGridLayer"; // atau QuantumMeshGrid

/* PROVIDER */
import { SpreadsheetCoreProvider } from "./spreadsheet-lite/engine/SpreadsheetCoreContext";

export default function TindakanTable() {
  const { tableRows, openDetail, openEditor, loading, refresh } =
    useTindakanBridgeAdapter();

  /* ================================================================
     STABLE COLUMN COUNT
  ================================================================= */
  const stableColumnCountRef = useRef<number>(10);

  if (tableRows.length > 0 && stableColumnCountRef.current === 10) {
    stableColumnCountRef.current = Object.keys(tableRows[0]).length;
  }

  const stableColumnCount = stableColumnCountRef.current;

  /* ================================================================
     COLUMN & ROW HOOKS — SAFE ORDER
  ================================================================= */
  const {
    columns,
    columnWidths,
    setColumnWidths,
    addColumn,
    removeColumn,
    updateColumn,
    reorderColumns,
  } = useSpreadsheetColumns(stableColumnCount);

  const { rows, setRows } = useSpreadsheetRows(stableColumnCount);

  /* Sync rows */
  useEffect(() => {
    const next = tableRows.map((row) =>
      Object.values(row).map((v) => String(v ?? ""))
    );
    setRows(next);
  }, [tableRows, setRows]);

  /* ================================================================
     SEARCH + PAGINATION
  ================================================================= */
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 15;

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(search.toLowerCase()))
    );
  }, [rows, search]);

  const totalPages = Math.ceil(filteredRows.length / perPage);

  const pagedData = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredRows.slice(start, start + perPage);
  }, [filteredRows, page, perPage]);

  /* ================================================================
     ROW ACTIONS
  ================================================================= */
  const handleRowClick = (index: number) => {
    const id = tableRows[index]?.id;
    if (id) openDetail(id);
  };

  const handleEdit = (index: number) => {
    const id = tableRows[index]?.id;
    if (id) openEditor(id);
  };

  /* ================================================================
     RENDER
  ================================================================= */
  return (
    <SpreadsheetCoreProvider>
      <TableContainer>
        {/* Toolbar */}
        <TableToolbar
          onSearch={setSearch}
          onRefresh={refresh}
          onFilter={() => {}}
          onExport={() => {}}
          dokterOptions={[]}
          statusOptions={[]}
        />

        {loading ? (
          <div className="text-cyan-300 text-center py-6">
            Memuat tindakan...
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="overflow-x-auto border border-cyan-900/30 rounded-t-lg">
              <table className="min-w-full border-separate border-spacing-0">
                <SpreadsheetHeader
                  columns={columns}
                  columnWidths={columnWidths}
                  setColumnWidths={setColumnWidths}
                  updateColumn={updateColumn}
                  removeColumn={removeColumn}
                  addColumn={addColumn}
                  reorderColumns={reorderColumns}
                />
              </table>
            </div>

            {/* BODY – Virtualized v7 */}
            <div className="h-[70vh] border border-cyan-900/30 rounded-b-lg overflow-hidden relative">
              {/* Cinematic layer */}
              <CinematicGridLayer />

              <VirtualizedList
                rowCount={pagedData.length}
                rowHeight={40}
                overscan={10}
                renderRow={(i) => {
                  const realIndex = (page - 1) * perPage + i;
                  const row = pagedData[i] ?? [];

                  return (
                    <SpreadsheetRowVirtual
                      r={realIndex}
                      row={row}
                      onClick={() => handleRowClick(realIndex)}
                      onEdit={() => handleEdit(realIndex)}
                    />
                  );
                }}
              />
            </div>

            {/* Pagination */}
            {filteredRows.length > perPage && (
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
              />
            )}
          </>
        )}
      </TableContainer>
    </SpreadsheetCoreProvider>
  );
}

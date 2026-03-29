"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Wifi, Database } from "lucide-react";
import { useDatabaseFetch } from "./hooks/useDatabaseFetch";
import {
  DatabaseSummaryCards,
  DatabaseTableList,
  DatabaseTablePreview,
} from "./components";
import AuditViewer from "./audit/AuditViewer"; // ← Tambahan audit viewer

export default function DatabasePage() {
  const {
    tables,
    columns,
    sample,
    selectedTable,
    setSelectedTable,
    loadingTables,
    loadingSchema,
    connected,
    fetchTables,
    fetchSchema,
    lastSync,
  } = useDatabaseFetch();

  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-full min-w-0 bg-gradient-to-b from-[#0a0f1e] to-[#0b1a2a] text-gray-200 p-6"
    >
      {/* =====================================================
          HEADER SECTION
      ====================================================== */}
      <div className="flex items-center justify-between mb-8 border-b border-cyan-700/30 pb-4">
        <div className="flex items-center gap-3">
          <Database className="text-cyan-400" size={28} />
          <h1 className="text-2xl font-semibold text-cyan-300 tracking-wide">
            Database Explorer
          </h1>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-400">
          <span>
            ⏱️ Last sync:{" "}
            <span className="text-cyan-300 font-medium">{lastSync}</span>
          </span>
          <span
            className={`flex items-center ${
              connected ? "text-emerald-400" : "text-red-400"
            }`}
          >
            <Wifi size={16} className="mr-1" />
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* =====================================================
          SUMMARY CARDS
      ====================================================== */}
      <DatabaseSummaryCards
        connected={connected}
        loading={loadingTables}
        count={tables.length}
      />

      {/* =====================================================
          TABLE LIST
      ====================================================== */}
      <DatabaseTableList
        tables={tables}
        selectedTable={selectedTable}
        setSelectedTable={setSelectedTable}
        fetchSchema={fetchSchema}
        fetchTables={fetchTables}
        router={router}
        loading={loadingTables}
      />

      {!loadingTables && !tables.length && (
        <div className="text-center text-gray-500 py-8">
          No tables available. Connect to Supabase first.
        </div>
      )}

      {/* =====================================================
          TABLE PREVIEW
      ====================================================== */}
      <DatabaseTablePreview
        selectedTable={selectedTable}
        columns={columns}
        sample={sample}
        loadingSchema={loadingSchema}
        router={router}
      />

      {/* =====================================================
          AUDIT VIEWER SECTION
      ====================================================== */}
      <AuditViewer />
    </motion.div>
  );
}

"use client";

import { RefreshCcw, Table2 } from "lucide-react";

type Props = {
  tables: string[];
  selectedTable: string | null;
  setSelectedTable: (name: string) => void;
  fetchSchema: (name: string) => void;
  fetchTables: () => void;
  router: any;
  loading: boolean;
};

export default function DatabaseTableList({
  tables,
  selectedTable,
  setSelectedTable,
  fetchSchema,
  fetchTables,
  loading,
}: Props) {
  return (
    <div className="bg-gray-900/50 rounded-xl border border-cyan-700/30 p-4 mb-8">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-cyan-300 flex items-center gap-2">
          <Table2 size={18} className="text-cyan-400" />
          Tables
        </h2>

        <button
          onClick={fetchTables}
          disabled={loading}
          className="flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200 transition"
        >
          <RefreshCcw
            size={16}
            className={loading ? "animate-spin text-cyan-400" : ""}
          />
          Refresh
        </button>
      </div>

      {/* TABLE LIST */}
      {loading ? (
        <div className="text-gray-500 text-sm text-center py-6">
          Loading tables...
        </div>
      ) : tables.length ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {tables.map((tableName) => (
            <button
              key={tableName}
              onClick={() => {
                setSelectedTable(tableName);
                fetchSchema(tableName);
              }}
              className={`block text-left w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-150
                ${
                  selectedTable === tableName
                    ? "bg-cyan-700/30 text-cyan-300 border border-cyan-600/40"
                    : "bg-gray-800/40 text-gray-300 hover:bg-cyan-800/10 hover:text-cyan-200"
                }`}
            >
              {tableName}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-6">
          No tables found in database.
        </div>
      )}
    </div>
  );
}

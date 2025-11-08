"use client";
import { Table, Columns, Rows } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Shimmer from "@/components/ui/shimmer";
import { ColumnInfo, SampleRow } from "../types";
// import { useRouter } from 'next/navigation'; // Tidak diperlukan di sini

interface Props {
  selectedTable: string | null;
  columns: ColumnInfo[];
  sample: SampleRow[];
  loadingSchema: boolean;
  router: any;
}

export default function DatabaseTablePreview({
  selectedTable,
  columns,
  sample,
  loadingSchema,
}: Props) {
  if (!selectedTable) {
    return (
      <div className="mt-10 p-8 bg-[#0d1424]/70 border border-cyan-800/20 rounded-2xl shadow-lg text-center text-gray-500">
        <Table
          size={48}
          className="mx-auto text-cyan-700 mb-4 animate-pulse-ring"
        />
        <p className="text-lg">
          Select a table from the list to view its schema and data preview.
        </p>
        <p className="text-sm mt-2 text-gray-600">
          Realtime data fetching powered by Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 bg-[#0d1424]/70 border border-cyan-800/20 rounded-2xl overflow-hidden shadow-lg">
      {/* HEADER */}
      <div className="flex items-center p-5 border-b border-cyan-800/30">
        <Table size={20} className="text-cyan-400 mr-3" />
        <h3 className="text-lg font-semibold text-cyan-300 tracking-wide">
          Table Preview:{" "}
          <span className="text-yellow-300">{selectedTable}</span>
        </h3>
      </div>

      {loadingSchema ? (
        <div className="p-10 text-center text-cyan-300">
          <Shimmer className="h-6 w-1/2 mx-auto mb-4" />
          <Shimmer className="h-4 w-1/3 mx-auto" />
          {/* ✅ FIX: Menghapus tag style. Animasi kini dikendalikan oleh class Shimmer di components/ui/shimmer.tsx */}
          <p className="mt-4 text-base font-medium animate-float-holo">
            Loading schema and sample data…
          </p>
        </div>
      ) : (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* COLUMN SCHEMA */}
          <Card className="bg-[#121c33]/70 border border-emerald-700/30 rounded-xl shadow-inner">
            <CardHeader className="pb-4 border-b border-emerald-700/20 flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-emerald-300 flex items-center gap-2">
                <Columns size={20} /> Column Schema
              </CardTitle>
              <Badge
                variant="outline"
                className="text-emerald-400 border-emerald-400/50"
              >
                {columns.length} Columns
              </Badge>
            </CardHeader>
            {/* ✅ FIX: Menggunakan class custom-scroll dari globals.css */}
            <CardContent className="pt-4 max-h-80 overflow-y-auto custom-scroll">
              {columns.length > 0 ? (
                <ul className="space-y-2">
                  {columns.map((col, index) => (
                    <li
                      key={col.column_name + index}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-emerald-900/20 transition-colors"
                    >
                      <span className="font-mono text-gray-200 text-sm">
                        {col.column_name}
                        <span className="ml-2 text-xs text-emerald-500 font-semibold">
                          ({col.data_type})
                        </span>
                      </span>
                      <div className="flex gap-2 text-xs">
                        {col.is_nullable === "NO" && (
                          <Badge
                            variant="secondary"
                            className="bg-red-800/30 text-red-300 border-red-500/30"
                          >
                            NOT NULL
                          </Badge>
                        )}
                        {col.column_default && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-800/30 text-blue-300 border-blue-500/30"
                          >
                            DEFAULT: {col.column_default}
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No schema details available.
                </p>
              )}
            </CardContent>
          </Card>

          {/* SAMPLE DATA */}
          <Card className="bg-[#121c33]/70 border border-indigo-700/30 rounded-xl shadow-inner">
            <CardHeader className="pb-4 border-b border-indigo-700/20 flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-indigo-300 flex items-center gap-2">
                <Rows size={20} /> Sample Data
              </CardTitle>
              <Badge
                variant="outline"
                className="text-indigo-400 border-indigo-400/50"
              >
                {sample.length} Rows
              </Badge>
            </CardHeader>
            {/* ✅ FIX: Menggunakan class custom-scroll dari globals.css */}
            <CardContent className="pt-4 max-h-80 overflow-y-auto custom-scroll">
              {sample.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-gray-300">
                    <thead className="bg-indigo-900/30 text-indigo-300 uppercase text-xs">
                      <tr>
                        {Object.keys(sample[0]).map((key) => (
                          <th
                            key={key}
                            className="px-4 py-2 text-left whitespace-nowrap"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sample.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="border-t border-indigo-800/20 hover:bg-indigo-900/10 transition-colors"
                        >
                          {Object.values(row).map((value, colIndex) => (
                            <td
                              key={colIndex}
                              className="px-4 py-2 whitespace-nowrap"
                            >
                              {value === null ||
                              typeof value === "undefined" ? (
                                <span className="text-gray-500 italic">
                                  null
                                </span>
                              ) : typeof value === "object" &&
                                value !== null ? (
                                <span className="text-gray-400">
                                  [{JSON.stringify(value).substring(0, 20)}...]
                                </span>
                              ) : (
                                String(value)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No sample data available.
                </p>
              )}
              {/* ✅ FIX: Scrollbar styling dihapus karena sudah ada di globals.css */}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

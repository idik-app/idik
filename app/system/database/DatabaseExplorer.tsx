// app/dashboard/database/DatabaseExplorer.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useDatabaseFetch } from "./hooks/useDatabaseFetch"; // Import hook yang baru dibuat
// Asumsi Anda memiliki komponen ini, sesuaikan path importnya
// import DatabaseTableList from './components/DatabaseTableList';
// import { Button } from '@/components/ui/button';

export default function DatabaseExplorer() {
  // Panggil hook untuk mendapatkan status dan data
  const { tables, isLoading, error, refreshTables } = useDatabaseFetch();

  // Asumsi: status koneksi (untuk ikon connected/disconnected)
  const [isConnected, setIsConnected] = useState(true);

  // Fungsi placeholder untuk Add Table
  const handleAddTable = () => {
    alert("Fitur Add Table: Arahkan ke form DDL (CREATE TABLE).");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-3">
          <span className="text-3xl">🗄️</span> Database Explorer
        </h1>
        <div className="text-sm text-gray-400">
          Last sync: {new Date().toLocaleTimeString()}
          <span
            className={`ml-2 font-bold ${
              isConnected ? "text-green-500" : "text-red-500"
            }`}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* --- Cards Status (Seperti di Screenshot) --- */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Card 1: Koneksi */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border-t-4 border-green-500">
          <h3 className="text-green-400 text-xl font-bold">Connected</h3>
          <p className="text-sm text-gray-400">Realtime sync active</p>
        </div>
        {/* Card 2: Keamanan */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border-t-4 border-yellow-500">
          <h3 className="text-yellow-400 text-xl font-bold">Encrypted</h3>
          <p className="text-sm text-gray-400">Role-based access (RBAC)</p>
        </div>
        {/* Card 3: Optimasi */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border-t-4 border-cyan-500">
          <h3 className="text-cyan-400 text-xl font-bold">Tables</h3>
          <p className="text-sm text-gray-400">Auto-indexed for performance</p>
        </div>
      </div>

      {/* --- Active Tables Section --- */}
      <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
        Active Tables
      </h2>

      <div className="flex justify-end gap-3 mb-4">
        {/* Tombol Refresh: Memanggil fungsi refreshTables dari hook */}
        <button
          onClick={refreshTables}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? <> 🔄 Refreshing...</> : <> 🔍 Refresh</>}
        </button>
        <button
          onClick={handleAddTable}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          + Add Table
        </button>
      </div>

      {/* --- Area Hasil --- */}
      <div className="bg-gray-800 p-6 rounded-lg min-h-[300px] flex items-center justify-center">
        {isLoading && (
          <div className="text-center text-lg text-gray-400">
            <div className="animate-spin w-8 h-8 border-t-2 border-b-2 border-cyan-500 rounded-full mx-auto mb-3"></div>
            Loading database tables...
          </div>
        )}

        {error && (
          <div className="text-center text-red-500 p-4 border border-red-700 rounded">
            ❌ **Gagal Memuat Data Skema!** <br /> {error}
          </div>
        )}

        {!isLoading && !error && tables.length === 0 && (
          <p className="text-center text-gray-400">
            Tidak ada tabel yang ditemukan di skema publik.
          </p>
        )}

        {!isLoading && !error && tables.length > 0 && (
          // Ganti ini dengan komponen tampilan tabel Anda:
          <div>
            <p className="text-green-400 mb-4">
              Ditemukan {tables.length} tabel aktif.
            </p>
            {/* <DatabaseTableList tables={tables} /> */}
            {/* Sementara: Tampilkan dalam bentuk JSON untuk verifikasi */}
            <pre className="bg-black/40 p-4 rounded-lg max-h-96 overflow-auto text-sm text-cyan-200">
              {JSON.stringify(tables, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

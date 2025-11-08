"use client";

/**
 * 📊 DashboardAuditPage
 * Halaman utama modul Audit – menampilkan riwayat aktivitas database
 * Semua log diambil dari tabel audit_log melalui komponen AuditViewer
 */

import AuditViewer from "./AuditViewer";

export default function DashboardAuditPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-cyan-950 p-6">
      <AuditViewer />
    </main>
  );
}

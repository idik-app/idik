"use client";

import React from "react";

/**
 * SpreadsheetLite v1 — Placeholder Container
 * Digunakan sebagai wrapper dasar agar tidak error saat di-import.
 * Implementasi fitur lengkap (drag, context menu, shortcut)
 * akan ditambahkan pada versi berikutnya.
 */

export default function SpreadsheetLite({
  children,
}: {
  children?: React.ReactNode;
}) {
  return <div className="w-full overflow-x-auto custom-scroll">{children}</div>;
}

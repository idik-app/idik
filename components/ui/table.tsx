"use client";

import * as React from "react";

/**
 * Komponen Table ringan dan konsisten untuk IDIK-App
 * Gaya dasar: border hologram cyan + text netral.
 */

export const Table = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className="w-full overflow-x-auto rounded-lg border border-cyan-700/40 bg-black/40">
    <table className={`w-full border-collapse text-sm ${className ?? ""}`}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <thead className={`bg-cyan-900/30 text-cyan-300 uppercase tracking-wide ${className ?? ""}`}>
    {children}
  </thead>
);

export const TableBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <tbody className={`divide-y divide-cyan-800/30 ${className ?? ""}`}>{children}</tbody>
);

export const TableRow = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <tr className={`hover:bg-cyan-500/5 transition ${className ?? ""}`}>
    {children}
  </tr>
);

export const TableHead = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    {...props}
    className={`px-4 py-2 text-left font-semibold border-b border-cyan-800/40 ${
      className ?? ""
    }`}
  >
    {children}
  </th>
);

export const TableCell = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    {...props}
    className={`px-4 py-2 align-middle text-neutral-200 ${className ?? ""}`}
  >
    {children}
  </td>
);

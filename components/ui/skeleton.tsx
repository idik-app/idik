"use client";

import * as React from "react";

/**
 * Komponen Skeleton / Shimmer Loading
 * Gaya: cyan hologram lembut dengan animasi gradien horizontal.
 */

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-cyan-500/10 ${
        className ?? ""
      }`}
      style={style}
    >
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
    </div>
  );
}

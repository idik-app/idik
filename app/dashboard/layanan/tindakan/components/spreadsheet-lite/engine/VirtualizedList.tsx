"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

interface Props {
  rowCount: number;
  rowHeight?: number;
  overscan?: number;
  renderRow: (index: number) => React.ReactElement;
}

export default function VirtualizedList({
  rowCount,
  rowHeight = 38,
  overscan = 8,
  renderRow,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback(() => {
    if (!containerRef.current) return;
    setScrollTop(containerRef.current.scrollTop);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      setViewportHeight(containerRef.current.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    rowCount,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan
  );

  const items = [];
  for (let i = startIndex; i < endIndex; i++) {
    items.push(
      <div
        key={i}
        style={{
          position: "absolute",
          top: i * rowHeight,
          height: rowHeight,
          left: 0,
          right: 0,
        }}
      >
        {renderRow(i)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{
        overflowY: "auto",
        height: "100%",
        position: "relative",
      }}
      className="custom-scroll"
    >
      <div
        style={{
          height: rowCount * rowHeight,
          position: "relative",
        }}
      >
        {items}
      </div>
    </div>
  );
}

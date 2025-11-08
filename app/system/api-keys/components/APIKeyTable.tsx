"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { APIKeyActions } from "./APIKeyActions"; // next batch
import { useAPIKeys } from "../hooks/useAPIKeys";

export function APIKeyTable() {
  const { keys, loading, fetchMore, hasMore } = useAPIKeys();
  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && fetchMore(),
      { threshold: 1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, fetchMore]);

  if (loading && keys.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full bg-cyan-500/10" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-cyan-700/40 bg-black/40 backdrop-blur-md shadow-lg overflow-hidden"
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-cyan-500/10 text-cyan-300">
            <TableHead>Nama Key</TableHead>
            <TableHead>Izin Akses</TableHead>
            <TableHead>Dibuat pada</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => (
            <TableRow
              key={key.id}
              className="hover:bg-cyan-500/5 text-neutral-200 transition"
            >
              <TableCell>{key.name}</TableCell>
              <TableCell>{key.permissions}</TableCell>
              <TableCell>
                {new Date(key.created_at).toLocaleDateString("id-ID")}
              </TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    key.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {key.status}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <APIKeyActions keyItem={key} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {loading && (
        <div className="p-3">
          <Skeleton className="h-8 w-full bg-cyan-500/10" />
        </div>
      )}

      {hasMore && <div ref={loaderRef} className="h-8" />}
    </motion.div>
  );
}

"use client";

import { useCallback, useState } from "react";

function isPublicSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function useTindakanCrud() {
  const [loading, setLoading] = useState(false);

  const createOne = useCallback(
    async (payload: Record<string, unknown>) => {
      setLoading(true);
      try {
        const res = await fetch("/api/tindakan", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          data?: { id?: string } | null;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.data?.id) {
          throw new Error(json.error || "Gagal membuat jadwal baru.");
        }
        return json.data;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /** PATCH via API + service role — menghindari RLS anon & penghapusan kolom diam-diam di klien. */
  const updateOne = useCallback(async (id: string, updates: any) => {
    setLoading(true);
    try {
      const payload =
        updates && typeof updates === "object"
          ? (updates as Record<string, unknown>)
          : {};
      const res = await fetch(`/api/tindakan/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(
          json.message || res.statusText || "Gagal memperbarui tindakan.",
        );
      }
      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Hapus lewat API + service role — selaras dengan GET daftar & PATCH; tahan RLS anon. */
  const deleteOne = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tindakan/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (res.ok && json.ok) return true;
      throw new Error(
        json.message ||
          (res.status === 404
            ? "Kasus tindakan tidak ditemukan."
            : "Gagal menghapus kasus tindakan."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, createOne, updateOne, deleteOne };
}


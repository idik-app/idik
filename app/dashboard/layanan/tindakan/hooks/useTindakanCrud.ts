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
      if (!isPublicSupabaseConfigured()) return null;
      setLoading(true);
      try {
        const mod = await import("@/lib/supabase/supabaseClient");
        const sb: any = mod.supabase as any;

        const variants: Record<string, unknown>[] = [payload];
        const p = { ...payload };
        if ("nama_pasien" in p) {
          const v = p.nama_pasien;
          delete p.nama_pasien;
          p.nama = v;
          variants.push({ ...p });
        }
        if ("no_rm" in p) {
          const v = p.no_rm;
          delete p.no_rm;
          p.rm = v;
          variants.push({ ...p });
        }

        let lastError: unknown = null;
        for (const body of variants) {
          let attemptBody: Record<string, unknown> = { ...body };
          for (let i = 0; i < 6; i += 1) {
            const { data, error } = await sb
              .from("tindakan")
              .insert(attemptBody)
              .select("id")
              .single();
            if (!error) return data ?? null;
            lastError = error;
            const msg = String((error as { message?: string })?.message ?? "");
            // Retry only for schema column mismatch; others should fail fast.
            if (!msg.includes("column") || !msg.includes("schema cache")) break;
            const missingColMatch = msg.match(/'([^']+)'/);
            const missingCol = missingColMatch?.[1]?.trim();
            if (!missingCol || !(missingCol in attemptBody)) break;
            // Drop kolom yang tidak ada di schema env ini, lalu coba lagi.
            const nextBody = { ...attemptBody };
            delete nextBody[missingCol];
            attemptBody = nextBody;
          }
        }
        throw lastError;
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


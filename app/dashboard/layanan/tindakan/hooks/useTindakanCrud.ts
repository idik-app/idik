"use client";

import { useCallback, useState } from "react";

function isPublicSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function useTindakanCrud() {
  const [loading, setLoading] = useState(false);

  const isSchemaColumnMismatchError = (error: unknown): boolean => {
    const msg = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
    return msg.includes("schema cache") && msg.includes("column");
  };

  const isRelationMissingError = (error: unknown): boolean => {
    const msg = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
    return (
      msg.includes("does not exist") ||
      msg.includes("could not find") ||
      msg.includes("schema cache") ||
      msg.includes("pgrst204")
    );
  };

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

  const updateOne = useCallback(
    async (id: string, updates: any) => {
      if (!isPublicSupabaseConfigured()) return false;
      setLoading(true);
      try {
        const mod = await import("@/lib/supabase/supabaseClient");
        const sb: any = mod.supabase as any;

        const baseUpdates: Record<string, unknown> =
          updates && typeof updates === "object" ? { ...(updates as Record<string, unknown>) } : {};

        const variants: Record<string, unknown>[] = [baseUpdates];
        const p = { ...baseUpdates };
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
            const { error } = await sb.from("tindakan").update(attemptBody).eq("id", id);
            if (!error) return true;
            lastError = error;
            if (!isSchemaColumnMismatchError(error)) break;
            const msg = String((error as { message?: string })?.message ?? "");
            const missingColMatch = msg.match(/'([^']+)'/);
            const missingCol = missingColMatch?.[1]?.trim();
            if (!missingCol || !(missingCol in attemptBody)) break;
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
    []
  );

  const deleteOne = useCallback(
    async (id: string) => {
      if (!isPublicSupabaseConfigured()) return false;
      setLoading(true);
      const mod = await import("@/lib/supabase/supabaseClient");
      const sb: any = mod.supabase as any;
      try {
        const delPrimary = await sb.from("tindakan").delete().eq("id", id).select("id");
        if (!delPrimary.error) {
          const deleted = Array.isArray(delPrimary.data) ? delPrimary.data.length : 0;
          if (deleted > 0) return true;
        } else if (!isRelationMissingError(delPrimary.error)) {
          throw delPrimary.error;
        }

        // Fallback legacy env: sebagian instalasi menyimpan data di tabel tindakan_medik.
        const delLegacy = await sb.from("tindakan_medik").delete().eq("id", id).select("id");
        if (!delLegacy.error) {
          const deleted = Array.isArray(delLegacy.data) ? delLegacy.data.length : 0;
          if (deleted > 0) return true;
          throw new Error("Data tindakan tidak ditemukan atau sudah terhapus.");
        }
        if (!isRelationMissingError(delLegacy.error)) {
          throw delLegacy.error;
        }
        throw new Error("Tabel tindakan tidak tersedia untuk proses hapus.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, createOne, updateOne, deleteOne };
}


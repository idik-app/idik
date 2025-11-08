"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export function useAPIKeys() {
  const supabase = createClient();
  const { toast } = useToast();

  const [keys, setKeys] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  // Ambil semua key
  const fetchKeys = useCallback(async () => {
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Gagal memuat key",
        description: error.message,
        type: "error",
      });
      return;
    }

    setKeys(data ?? []);
  }, [supabase, toast]);

  // Buat key baru
  const createKey = useCallback(
    async ({ name, permissions }: { name: string; permissions: string }) => {
      setCreating(true);
      const { error } = await supabase
        .from("api_keys")
        .insert([{ name, permissions }]);
      setCreating(false);

      if (error) {
        toast({
          title: "Gagal membuat key",
          description: error.message,
          type: "error",
        });
      } else {
        toast({
          title: "Berhasil",
          description: "API Key berhasil dibuat.",
          type: "success",
        });
        fetchKeys();
      }
    },
    [supabase, fetchKeys, toast]
  );

  // Nonaktifkan key (revoke)
  const revokeKey = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("api_keys")
        .update({ status: "revoked" })
        .eq("id", id);

      if (error) {
        toast({
          title: "Gagal menonaktifkan key",
          description: error.message,
          type: "error",
        });
      } else {
        toast({
          title: "Key dinonaktifkan",
          description: "Key telah berhasil dinonaktifkan.",
          type: "info",
        });
        fetchKeys();
      }
    },
    [supabase, fetchKeys, toast]
  );

  // Regenerasi key (buat ulang)
  const regenerateKey = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("api_keys")
        .update({
          token_hash: crypto.randomUUID().replace(/-/g, ""),
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        toast({
          title: "Gagal memperbarui key",
          description: error.message,
          type: "error",
        });
      } else {
        toast({
          title: "Key diperbarui",
          description: "Key telah berhasil dibuat ulang.",
          type: "success",
        });
        fetchKeys();
      }
    },
    [supabase, fetchKeys, toast]
  );

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  return {
    keys,
    createKey,
    revokeKey, // ✅ ditambahkan
    regenerateKey, // ✅ ditambahkan
    creating,
  };
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

/*───────────────────────────────────────────────
🧩 useAPIKeys v3.2 — Final Stable Edition
───────────────────────────────────────────────*/
export function useAPIKeys() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

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
  }, [toast]);

  const createKey = useCallback(
    async ({ name, permissions }: { name: string; permissions: string }) => {
      setCreating(true);
      const { error } = await (supabase as any).from("api_keys").insert([{ name, permissions }]);
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
    [fetchKeys, toast]
  );

  const revokeKey = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any).from("api_keys").update({ status: "revoked" }).eq("id", id);
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
    [fetchKeys, toast]
  );

  const regenerateKey = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any).from("api_keys").update({ token_hash: crypto.randomUUID().replace(/-/g, ""), status: "active", updated_at: new Date().toISOString() }).eq("id", id);
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
    [fetchKeys, toast]
  );

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  return { keys, createKey, revokeKey, regenerateKey, creating };
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast"; // ✅ perbaikan
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAPIKeys } from "../hooks/useAPIKeys";

export function APIKeyActions({ keyItem }: { keyItem: any }) {
  const { revokeKey, regenerateKey } = useAPIKeys();
  const [confirmType, setConfirmType] = useState<null | "revoke" | "regen">(
    null
  );
  const { toast } = useToast(); // ✅ gunakan hook

  const handleCopy = async () => {
    await navigator.clipboard.writeText(keyItem.partial ?? "sk_live_****xxxx");
    toast({
      title: "Disalin",
      description: "Potongan key telah disalin.",
      type: "success",
    });
  };

  const handleRevoke = async () => {
    await revokeKey(keyItem.id);
    toast({
      title: "Key dinonaktifkan",
      description: `Key "${keyItem.name}" berhasil dinonaktifkan.`,
      type: "info",
    });
    setConfirmType(null);
  };

  const handleRegenerate = async () => {
    await regenerateKey(keyItem.id);
    toast({
      title: "Key diperbarui",
      description: `Key "${keyItem.name}" berhasil diganti.`,
      type: "success",
    });
    setConfirmType(null);
  };

  return (
    <div className="flex gap-2 justify-end">
      <Button
        size="icon"
        onClick={handleCopy}
        title="Salin potongan key"
        className="bg-cyan-800/20 hover:bg-cyan-800/40 border border-cyan-600/40"
      >
        🗝️
      </Button>

      <Button
        size="icon"
        onClick={() => setConfirmType("regen")}
        title="Regenerate key"
        className="bg-yellow-800/20 hover:bg-yellow-800/40 border border-yellow-600/40"
      >
        ⟳
      </Button>

      <Button
        size="icon"
        onClick={() => setConfirmType("revoke")}
        title="Nonaktifkan key"
        className="bg-red-800/20 hover:bg-red-800/40 border border-red-600/40"
      >
        ✖️
      </Button>

      <AlertDialog
        open={!!confirmType}
        onOpenChange={() => setConfirmType(null)}
      >
        <AlertDialogContent className="bg-black/70 border border-cyan-700/50 text-cyan-100 backdrop-blur-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gold">
              {confirmType === "revoke"
                ? "Nonaktifkan Key?"
                : "Buat Ulang Key?"}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <p className="text-sm text-cyan-300/80">
            {confirmType === "revoke"
              ? "Key ini akan dinonaktifkan dan tidak bisa digunakan lagi."
              : "Key lama akan dinonaktifkan dan diganti dengan yang baru."}
          </p>

          <AlertDialogFooter className="pt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmType(null)}
              className="border border-cyan-700/60 hover:bg-cyan-800/30"
            >
              Batal
            </Button>
            <Button
              onClick={
                confirmType === "revoke" ? handleRevoke : handleRegenerate
              }
              className={`border ${
                confirmType === "revoke"
                  ? "border-red-400 text-red-300 bg-red-800/20 hover:bg-red-700/40"
                  : "border-yellow-400 text-yellow-300 bg-yellow-800/20 hover:bg-yellow-700/40"
              }`}
            >
              Konfirmasi
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

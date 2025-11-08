"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAPIKeys } from "../hooks/useAPIKeys";

export function APIKeyModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [perm, setPerm] = useState("read");
  const { createKey, creating } = useAPIKeys();

  const handleSubmit = async () => {
    if (!name) return;
    await createKey({ name, permissions: perm });
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/60 border border-cyan-500/40 text-cyan-100 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader>
            <DialogTitle className="text-gold text-lg font-semibold">
              Generate New API Key
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nama Key</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="contoh: Supabase Client"
                className="bg-cyan-900/20 border-cyan-700 text-cyan-200"
              />
            </div>
            <div>
              <Label>Izin Akses</Label>
              <select
                value={perm}
                onChange={(e) => setPerm(e.target.value)}
                className="w-full rounded-md bg-cyan-900/20 border border-cyan-700 p-2 text-cyan-200"
              >
                <option value="read">Read Only</option>
                <option value="write">Write</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="border border-cyan-700/60 hover:bg-cyan-800/30"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={creating}
              className="bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30"
            >
              {creating ? "Membuat..." : "Buat Key"}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

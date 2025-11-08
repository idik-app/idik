"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/app/system/api-keys/components/ui/breadcrumb";
import { useState } from "react";
import { APIKeyTable } from "./components/APIKeyTable";
import { APIKeyModal } from "./components/APIKeyModal";

export default function Page() {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink href="/system">System</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/system/api-keys" active>
                API Keys
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
          <h1 className="text-2xl font-bold text-gold mt-2">
            🔑 API Keys Management
          </h1>
        </div>

        <Button
          onClick={() => setOpen(true)}
          className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300"
        >
          + Generate New Key
        </Button>
      </div>

      {/* Content */}
      <APIKeyTable />
      <APIKeyModal open={open} onOpenChange={setOpen} />
    </motion.div>
  );
}

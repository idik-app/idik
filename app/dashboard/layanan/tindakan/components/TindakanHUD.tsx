"use client";
import DiagnosticsHUD from "@/app/dashboard/ui/DiagnosticsHUD";
import { motion } from "framer-motion";

export default function TindakanHUD() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 2.4, duration: 0.5 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <DiagnosticsHUD />
    </motion.div>
  );
}

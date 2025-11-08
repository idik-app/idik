"use client";

import { motion } from "framer-motion";
import JarvisLoader from "@/components/JarvisLoader";
import { useUI } from "@app/contexts/UIContext";

export default function GlobalLogoutOverlay() {
  const { showLogoutAnim } = useUI();
  if (!showLogoutAnim) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <JarvisLoader mode="logout" autoRedirect />
    </motion.div>
  );
}

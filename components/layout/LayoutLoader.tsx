"use client";
import { motion } from "framer-motion";
import JarvisLoader from "@/components/JarvisLoader";
import useGlobalLoader from "@/components/useGlobalLoader";

export default function LayoutLoader() {
  const loading = useGlobalLoader();
  if (!loading) return null;
  return (
    <motion.div
      key="loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <JarvisLoader mode="dashboard" />
    </motion.div>
  );
}

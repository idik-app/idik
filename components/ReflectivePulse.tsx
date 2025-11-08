"use client";

import { motion } from "framer-motion";

export default function ReflectivePulse() {
  return (
    <motion.div
      animate={{
        filter: ["brightness(0.95)", "brightness(1.05)", "brightness(0.95)"],
      }}
      transition={{ duration: 12, ease: "linear", repeat: Infinity }}
      className="fixed inset-0 pointer-events-none z-[1]"
    />
  );
}

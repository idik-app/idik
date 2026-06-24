"use client";

import { memo } from "react";
import { motion } from "framer-motion";

function JarvisModeHudDecorInner() {
  return (
    <motion.div
      className="pointer-events-none absolute bottom-8 right-8 hidden lg:block"
      animate={{ rotate: 360 }}
      transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      aria-hidden
    >
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <circle
          cx="36"
          cy="36"
          r="34"
          stroke="rgba(0,224,255,0.2)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <path
          d="M36 8 L39 33 L36 36 L33 33 Z M36 64 L39 39 L36 36 L33 39 Z M8 36 L33 39 L36 36 L33 33 Z M64 36 L39 39 L36 36 L39 33 Z"
          fill="rgba(0,224,255,0.15)"
          stroke="rgba(0,224,255,0.45)"
          strokeWidth="0.75"
        />
        <circle cx="36" cy="36" r="3" fill="rgba(251,191,36,0.9)" />
      </svg>
    </motion.div>
  );
}

export default memo(JarvisModeHudDecorInner);

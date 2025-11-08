"use client";

import { motion } from "framer-motion";
import { X, CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  id?: string;
  type: "success" | "error" | "warning" | "info" | "system";
  message: string;
  duration?: number;
  onClose?: () => void;
}

export default function NotificationPanel({
  type,
  message,
  duration = 3000,
  onClose,
}: Props) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p > 0 ? p - 100 / (duration / 100) : 0));
    }, 100);
    return () => clearInterval(interval);
  }, [duration]);

  const icons = {
    success: <CheckCircle className="text-cyan-400" />,
    error: <XCircle className="text-red-400" />,
    warning: <AlertTriangle className="text-amber-400" />,
    info: <Info className="text-cyan-300" />,
    system: <Info className="text-emerald-400" />,
  };

  const bg =
    type === "success"
      ? "from-cyan-500/20 to-emerald-500/10"
      : type === "error"
      ? "from-red-500/20 to-pink-500/10"
      : type === "warning"
      ? "from-amber-500/20 to-yellow-500/10"
      : "from-cyan-600/20 to-blue-500/10";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -20 }}
      transition={{ duration: 0.25, type: "spring" }}
      className={`relative overflow-hidden backdrop-blur-xl border border-cyan-400/40 rounded-xl 
                  shadow-[0_0_12px_rgba(0,255,255,0.2)] bg-gradient-to-br ${bg} p-4 flex items-start gap-3`}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1 text-sm text-gray-100 leading-snug">
        {message}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-cyan-400 via-gold-400 to-transparent"
          style={{ width: `${progress}%` }}
        />
      </div>
      <button
        onClick={onClose}
        className="ml-2 hover:scale-110 transition-transform text-cyan-300"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

"use client";
import { Brain, AlertTriangle, Zap, Activity } from "lucide-react";
import { AIMode } from "./aiStatusHooks";

export default function AIStatusIcon({ mode }: { mode: AIMode }) {
  switch (mode) {
    case "learning":
      return <Brain className="text-cyan-400" size={26} />;
    case "alert":
      return <AlertTriangle className="text-red-400" size={26} />;
    case "predictive":
      return <Zap className="text-yellow-400" size={26} />;
    default:
      return <Activity className="text-gray-400" size={26} />;
  }
}

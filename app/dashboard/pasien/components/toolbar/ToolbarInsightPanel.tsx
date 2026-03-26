"use client";

interface ToolbarInsightPanelProps {
  show: boolean;
  insightText: string;
}

export default function ToolbarInsightPanel({
  show,
  insightText,
}: ToolbarInsightPanelProps) {
  if (!show) return null;

  return (
    <div
      className="relative z-20 mx-auto mt-3 w-full max-w-3xl 
                 px-4 py-2 text-[12px] leading-relaxed
                 text-cyan-100 rounded-lg text-center
                 bg-gradient-to-r from-cyan-900/60 to-gray-900/80
                 border border-yellow-400/30
                 shadow-[0_0_20px_rgba(255,215,0,0.25)]
                 backdrop-blur-md whitespace-pre-line
                 pointer-events-auto
                 animate-in fade-in slide-in-from-top-1 zoom-in-95 duration-200"
    >
      {insightText}
    </div>
  );
}

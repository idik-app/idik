"use client";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSimrsBotPanelOptional } from "./SimrsBotPanelContext";

type Props = {
  tindakanId: string;
  noRm: string;
  namaPasien?: string;
  fieldKey: string;
  tab?: string;
  empty: boolean;
  className?: string;
};

/** Tombol Suruh bot — hanya tampil jika field kosong + provider tersedia. */
export default function BotAskButton({
  tindakanId,
  noRm,
  namaPasien,
  fieldKey,
  tab,
  empty,
  className,
}: Props) {
  const bot = useSimrsBotPanelOptional();
  if (!bot || !empty || !tindakanId || !noRm) return null;

  return (
    <button
      type="button"
      data-no-row-click="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void bot.openAsk({
          tindakanId,
          noRm,
          namaPasien,
          fieldKey,
          tab,
        });
      }}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-violet-500/50 bg-violet-600/90 px-1.5 text-[9px] font-black uppercase tracking-wide text-white",
        "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
        "dark:text-white",
        className,
      )}
      title="Suruh bot cari nilai di SIMRS"
    >
      <Bot size={12} strokeWidth={2.5} />
      Suruh bot
    </button>
  );
}

import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

export type PrintIconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  /** Ukuran sisi (px); default 16 */
  size?: number;
};

/**
 * Ikon printer / cetak (stroke), mengikuti gaya ikon outline umum.
 */
export function PrintIcon({
  className,
  size = 16,
  ...props
}: PrintIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden
      {...props}
    >
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
      <rect width={12} height={8} x={6} y={14} rx={1} />
    </svg>
  );
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils"; // Asumsi Anda memiliki file utilitas cn (clsx + twMerge)

// Definisi Varian Badge menggunakan cva (Class Variance Authority)
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Varian default IDIK-App (diperkuat dengan Gold-Cyan)
        default:
          "border-transparent bg-cyan-600/80 text-cyan-50 hover:bg-cyan-600/90 shadow-cyan-500/30",

        // Varian 'secondary' (digunakan untuk detail NOT NULL/DEFAULT)
        secondary:
          "border-transparent bg-gray-700/60 text-gray-300 hover:bg-gray-700/80",

        // Varian 'outline' (digunakan untuk hitungan kolom/baris)
        outline: "text-foreground border-cyan-500/40",

        // Varian 'destructive' (opsional, untuk error/warning)
        destructive:
          "border-transparent bg-red-600/80 text-red-50 hover:bg-red-600/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

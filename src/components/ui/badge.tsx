import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        excellent: "border-transparent bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30 animate-pulse hover:shadow-green-500/50",
        good: "border-transparent bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/25 hover:shadow-blue-500/40",
        moderate: "border-transparent bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md shadow-amber-500/25 animate-pulse hover:shadow-amber-500/40",
        poor: "border-transparent bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse hover:shadow-red-500/50",
        critical: "border-transparent bg-gradient-to-r from-red-600 to-red-800 text-white shadow-xl shadow-red-600/40 animate-bounce hover:shadow-red-600/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

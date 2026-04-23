import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30",
        success: "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
        warning: "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30",
        danger:  "bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/30",
        muted:   "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

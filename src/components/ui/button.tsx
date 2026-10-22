"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "ai";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  default: "bg-zinc-900 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] hover:bg-zinc-800 active:bg-zinc-950",
  secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80",
  outline: "border border-zinc-200 bg-white text-zinc-800 shadow-[var(--shadow-card)] hover:border-zinc-300 hover:bg-zinc-50",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-brand-700 text-white hover:bg-brand-800",
  // AI eylemleri: gradyan yok — vurgu renginde ince çerçeve, metin mürekkep
  ai: "border border-brand-200 bg-brand-50/70 text-brand-900 hover:border-brand-300 hover:bg-brand-100/70 [&_svg]:text-brand-600",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-3.5 text-[13px] gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  icon: "h-8 w-8 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-lg font-medium tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

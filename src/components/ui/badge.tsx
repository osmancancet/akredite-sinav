import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "slate" | "brand" | "emerald" | "amber" | "red" | "sky" | "rose";

const tones: Record<Tone, string> = {
  slate: "bg-zinc-100 text-zinc-700 ring-zinc-200/80",
  brand: "bg-brand-50 text-brand-800 ring-brand-200/80",
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  amber: "bg-amber-50 text-amber-800 ring-amber-200/80",
  red: "bg-red-50 text-red-700 ring-red-200/80",
  sky: "bg-sky-50 text-sky-800 ring-sky-200/80",
  rose: "bg-rose-50 text-rose-800 ring-rose-200/80",
};

export function Badge({ tone = "slate", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", tones[tone], className)}
      {...props}
    />
  );
}

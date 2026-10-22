"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: React.ReactNode; icon?: React.ReactNode; badge?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("inline-flex flex-wrap gap-0.5 rounded-lg border border-zinc-200/80 bg-zinc-100/70 p-0.5", className)}>
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5",
              active ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgb(24_24_27/0.08)] ring-1 ring-zinc-200/70" : "text-zinc-500 hover:text-zinc-900",
            )}
          >
            {it.icon}
            {it.label}
            {it.badge}
          </button>
        );
      })}
    </div>
  );
}

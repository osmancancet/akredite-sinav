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
    <div className={cn("inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1", className)}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
            value === it.value ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
          )}
        >
          {it.icon}
          {it.label}
          {it.badge}
        </button>
      ))}
    </div>
  );
}

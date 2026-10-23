"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePref } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Açık tema", icon: Sun },
  { value: "dark", label: "Koyu tema", icon: Moon },
  { value: "system", label: "Sistem teması", icon: Monitor },
];

/** Açık / koyu / sistem tema seçici (üç durumlu segment). */
export function ThemeToggle() {
  const { pref, setPref } = useTheme();
  return (
    <div role="radiogroup" aria-label="Tema" className="hidden items-center rounded-lg border border-zinc-200/80 bg-zinc-100/60 p-0.5 md:inline-flex">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={pref === value}
          aria-label={label}
          title={label}
          onClick={() => setPref(value)}
          className={cn(
            "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors",
            pref === value ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgb(0_0_0/0.12)] ring-1 ring-zinc-200/70" : "text-zinc-400 hover:text-zinc-700",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-zinc-200/80 bg-white shadow-[var(--shadow-card)]", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 text-zinc-400 [&_svg]:h-4 [&_svg]:w-4">{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-zinc-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function StatTile({
  label,
  value,
  hint,
  tone = "slate",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "slate" | "brand" | "emerald" | "amber" | "red";
  icon?: React.ReactNode;
}) {
  const tones = {
    slate: "text-zinc-900",
    brand: "text-brand-800",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };
  const dot = { slate: "bg-zinc-300", brand: "bg-brand-500", emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" };
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2 text-[11.5px] font-medium text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", dot[tone])} />
          {label}
        </span>
        <span className="text-zinc-300 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-zinc-400">{icon}</span>
      </div>
      <div className={cn("mt-2 font-mono text-[26px] font-medium leading-none tracking-tight tabular-nums", tones[tone])}>{value}</div>
      {hint && <div className="mt-1.5 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

/** Modül sayfa başlığı: serif başlık + açıklama + eylemler */
export function PageIntro({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow && <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-700">{eyebrow}</div>}
        <h1 className="font-display mt-1 text-[30px] font-medium leading-tight text-zinc-950">{title}</h1>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
